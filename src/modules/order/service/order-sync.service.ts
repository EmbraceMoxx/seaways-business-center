import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import {
  QueryOrderCodesDto,
  SyncOrderStatusDto,
} from '@src/dto/order/order.sync.dto';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import * as dayjs from 'dayjs';
import { OrderLogHelper } from '@modules/order/helper/order.log.helper';
import { OPERATE_STRATEGY } from '@modules/order/strategy/order-sync.strategy';
import { OrderSyncCancelService } from '@modules/order/strategy/order-sync-cancel.service';
@Injectable()
export class OrderSyncService {
  private readonly logger = new Logger(OrderSyncService.name);
  constructor(
    @InjectRepository(OrderMainEntity)
    private orderRepository: Repository<OrderMainEntity>,
    private businessLogService: BusinessLogService,
    private readonly orderSyncCancelService: OrderSyncCancelService,
    private dataSource: DataSource, // 添加数据源注入
  ) {}
  /**
   * 获取需要同步状态的订单编码列表及相关时间范围
   *
   * @returns 返回包含订单编码列表和时间范围的查询结果对象
   */
  async getSyncOrderCodes(): Promise<QueryOrderCodesDto> {
    // 获取已推单成功的线上订单编码
    const orderList = await this.orderRepository.findBy({
      orderStatus: OrderStatusEnum.PUSHED,
      deleted: GlobalStatusEnum.NO,
    });
    if (orderList.length === 0) {
      this.logger.log('当前没有需要同步状态的订单');
      return new QueryOrderCodesDto();
    }
    // 筛选出最小和最大的pushTime
    const pushTimes = orderList
      .map((order) => order.pushTime)
      .filter((time) => time !== null) as Date[];
    if (pushTimes.length === 0) {
      // 若存在已推送的订单而没有push_time 则认为是脏数据不允许推送
      this.logger.log('当前批次订单不存在推送时间不允许同步，请确认！');
      return new QueryOrderCodesDto();
    }

    // 查询出订单集合的最小创建时间/推送时间
    const minPushTime = pushTimes
      .map((time) => dayjs(time))
      .reduce((min, current) => (current.isBefore(min) ? current : min))
      .toDate();
    // 查询出订单集合的最大创建时间/推送时间
    const maxPushTime = pushTimes
      .map((time) => dayjs(time))
      .reduce((max, current) => (current.isAfter(max) ? current : max))
      .toDate();
    const orderCodes = orderList.map((order) => order.orderCode);
    return {
      orderCodes,
      startTime: minPushTime,
      endTime: maxPushTime,
    };
  }
  /**
   * 同步聚水潭订单状态
   *
   * 根据传入的操作类型（如发货、取消等），批量处理订单状态变更。
   * 支持按 operate 字段分组并发执行不同操作逻辑，并记录相应业务日志。
   *
   * @param request - 订单状态同步请求数据列表，每个元素包含订单编号和操作类型
   *
   * 示例输入：
   * [
   *   { orderCode: 'ORD123456', operate: 1 },
   *   { orderCode: 'ORD123457', operate: 2 }
   * ]
   *
   * 操作类型说明：
   * - operate = 1: 发货操作
   * - operate = 2: 取消订单操作（预留）
   */
  async syncJstOrderStatus(request: SyncOrderStatusDto[]) {
    const program = 'OrderSyncService.syncJstOrderStatus';

    // 按 operate 分组
    const group = new Map<number, SyncOrderStatusDto[]>();
    request.forEach((dto) => {
      const arr = group.get(dto.operate) ?? [];
      arr.push(dto);
      group.set(dto.operate, arr);
    });
    /* 2. 每组内部串行处理单个订单（事务隔离） */
    await Promise.all(
      Array.from(group.entries()).map(async ([operate, list]) => {
        for (const dto of list) {
          try {
            // 一个订单一个事务
            await this.dataSource.transaction(async (manager) =>
              this.handleSingleOrder(operate, dto, program, manager),
            );
          } catch (e) {
            // 记录失败，继续下一个
            this.logger.error(
              `[operate=${operate}] 订单 ${dto.orderCode} 同步失败: ${e.message}`,
              e.stack,
            );
          }
        }
      }),
    );
  }
  /**
   * 处理单个订单（逻辑基本同原 handleOperateGroup，但只处理一条）
   */
  private async handleSingleOrder(
    operate: number,
    dto: SyncOrderStatusDto,
    program: string,
    manager: EntityManager,
  ): Promise<void> {
    const strategy = OPERATE_STRATEGY.get(operate);
    if (!strategy) {
      this.logger.error(`未注册的操作类型: ${operate}`);
      return;
    }

    /* 1. 查库 */
    const candidate = await manager.findOne(OrderMainEntity, {
      where: {
        orderCode: dto.orderCode,
        deleted: GlobalStatusEnum.NO,
      },
      select: ['id', 'orderCode', 'orderStatus'],
    });

    if (!candidate) {
      this.logger.warn(`订单 ${dto.orderCode} 不存在，跳过`);
      return;
    }

    /* 2. 状态校验 */
    if (candidate.orderStatus !== strategy.fromStatus) {
      this.logger.warn(
        `订单 ${dto.orderCode} 当前状态 ${candidate.orderStatus} 不符合要求 ${strategy.fromStatus}，跳过`,
      );
      return;
    }

    /* 3. 更新 */
    const { affected = 0 } = await manager.update(
      OrderMainEntity,
      { id: candidate.id, orderStatus: strategy.fromStatus },
      {
        orderStatus: strategy.toStatus,
        reviserId: '-1',
        receiverName: '系统自动同步',
        revisedTime: dayjs().toDate(),
        ...strategy.extraPayload?.(''),
      },
    );

    if (affected === 0) {
      this.logger.warn(`订单 ${dto.orderCode} 更新失败，可能并发冲突`);
      return;
    }

    /* 4. 副作用 */
    if (strategy.sideEffects?.length) {
      for (const SideEffectClass of strategy.sideEffects) {
        if (SideEffectClass === OrderSyncCancelService) {
          await this.orderSyncCancelService.handle(
            candidate.orderCode,
            manager,
          );
        }
      }
    }

    /* 5. 日志 */
    const logInput = OrderLogHelper.getOrderOperate(
      {
        businessSystemId: '',
        exp: 0,
        iat: 0,
        ipAddress: '',
        username: '',
        userId: '-1',
        nickName: '系统自动同步',
      },
      strategy.logTemplate,
      program,
      String(candidate.id),
    );
    await this.businessLogService.writeLog(logInput, manager);
  }
}
