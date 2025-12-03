import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { DataSource, In, Repository } from 'typeorm';
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
type StatusCandidate = Pick<
  OrderMainEntity,
  'id' | 'orderCode' | 'orderStatus'
>;
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
    await this.dataSource.transaction(async (manager) => {
      // 每组并发执行
      await Promise.all(
        Array.from(group.entries()).map(([operate, list]) =>
          this.handleOperateGroup(operate, list, program, manager),
        ),
      );
    });
  }

  private async handleOperateGroup(
    operate: number,
    list: SyncOrderStatusDto[],
    program: string,
    manager: typeof this.dataSource.manager,
  ): Promise<void> {
    this.logger.log(`进入处理逻辑：${operate}`);
    const strategy = OPERATE_STRATEGY.get(operate);
    if (!strategy) {
      this.logger.error(`未注册的操作类型: ${operate}`);
      return;
    }

    const orderCodes = list.map((e) => e.orderCode);

    // 1. 查库
    const candidates: StatusCandidate[] = await manager.find(OrderMainEntity, {
      where: { orderCode: In(orderCodes), deleted: GlobalStatusEnum.NO },
      select: ['id', 'orderCode', 'orderStatus'],
    });

    // 2. 差异比对
    const existCodeSet = new Set(candidates.map((c) => c.orderCode));
    const missing = orderCodes.filter((c) => !existCodeSet.has(c));
    if (missing.length) {
      this.logger.warn(
        `[${operate}] 以下订单在库中不存在，跳过：${missing.join(',')}`,
      );
    }
    this.logger.log(`差异比对 candidates：${JSON.stringify(candidates)}`);
    // 3. 过滤可操作的订单
    const toUpdate = candidates.filter(
      (c) => c.orderStatus === strategy.fromStatus,
    );
    this.logger.log(
      `[operate=2] fromStatus: ${
        strategy.fromStatus
      }, candidateStatus: ${candidates.map((c) => c.orderStatus).join(',')}`,
    );
    if (!toUpdate.length) return;
    this.logger.log(`[operate=2] toUpdate length: ${toUpdate.length}`);
    // 4. 批量更新
    const ids = toUpdate.map((c) => c.id);

    const { affected = 0 } = await manager.update(
      OrderMainEntity,
      { id: In(ids), orderStatus: strategy.fromStatus },
      {
        orderStatus: strategy.toStatus,
        reviserId: '-1',
        receiverName: '系统自动同步',
        revisedTime: dayjs().toDate(),
        ...strategy.extraPayload?.(''), // 支持额外字段
      },
    );

    // 5. 执行副作用
    if (strategy.sideEffects?.length) {
      this.logger.log(`strategy.sideEffects:${strategy.sideEffects}`);
      for (const SideEffectClass of strategy.sideEffects) {
        if (SideEffectClass === OrderSyncCancelService) {
          for (const orderCode of toUpdate.map((c) => c.orderCode)) {
            await this.orderSyncCancelService.handle(orderCode, manager);
          }
        }
      }
    }
    // 5. 写日志
    const logIds = ids.slice(0, affected);
    await Promise.all(
      logIds.map((id) => {
        const logInput = OrderLogHelper.getOrderOperate(
          {
            businessSystemId: '',
            exp: 0,
            iat: 0,
            ipAddress: '',
            username: '',
            userId: '1',
            nickName: '超级管理员',
          },
          strategy.logTemplate,
          program,
          String(id),
        );
        return this.businessLogService.writeLog(logInput, manager);
      }),
    );
  }
}
