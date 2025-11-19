import { Injectable, Logger } from '@nestjs/common';
import { OrderEventEntity } from '../entities/order.event.entity';
import { DataSource } from 'typeorm';
import {
  OrderEventStatusEnum,
  OrderEventTypeEnum,
} from './order-event.constant';
import { BusinessException } from '@src/dto';
import { OrderMainEntity } from '../entities/order.main.entity';
import { generateId } from '@src/utils';
import * as dayjs from 'dayjs';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import { OrderLogHelper } from '../helper/order.log.helper';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { BusinessLogService } from '@src/modules/common/business-log/business-log.service';

@Injectable()
export class OrderEventService {
  private readonly _logger = new Logger(OrderEventService.name);

  constructor(
    private readonly _dataSource: DataSource,
    private readonly _businessLogService: BusinessLogService,
  ) {}

  /**
   * 创建订单推送事件
   * @param orderId 订单ID
   */
  async createOrderPushEvent(
    orderId: string,
    user: JwtUserPayload,
  ): Promise<OrderEventEntity> {
    const thisContext = `${this.constructor.name}.createOrderPushEvent`;

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 先查询该订单是否已有未处理的推送事件
      const orderEventRepo =
        queryRunner.manager.getRepository(OrderEventEntity);
      const existingEvent = await orderEventRepo.findOne({
        where: {
          businessId: orderId,
          eventType: OrderEventTypeEnum.ORDER_PUSH,
          eventStatus: OrderEventStatusEnum.PENDING,
        },
      });

      if (existingEvent) {
        // 如果有，直接返回该事件
        this._logger.warn(
          `Order push event already exists for orderId=${orderId}, eventId=${existingEvent.id}`,
          thisContext,
        );
        await queryRunner.commitTransaction();
        return existingEvent;
      } else {
        // 如果没有，创建一个新的事件记录
        const orderMainRepo =
          queryRunner.manager.getRepository(OrderMainEntity);
        const orderMain = await orderMainRepo.findOne({
          where: { id: orderId },
        });

        if (!orderMain) {
          this._logger.warn(
            `Order not found when creating push event, orderId=${orderId}`,
            thisContext,
          );
          throw new BusinessException(`未找到订单`);
        }

        // 检查订单状态是否允许创建推送事件
        if (orderMain.orderStatus != String(OrderStatusEnum.PENDING_PUSH)) {
          this._logger.warn(
            `Order status not valid for push event, orderId=${orderId}, status=${orderMain.orderStatus}`,
            thisContext,
          );
          throw new BusinessException(`订单状态不允许推送`);
        }

        const title = `线上订单号：${orderMain.onlineOrderCode}，客户：${orderMain.customerName}`;
        const newEvent = orderEventRepo.create({
          id: generateId(),
          eventType: OrderEventTypeEnum.ORDER_PUSH,
          eventStatus: OrderEventStatusEnum.PENDING,
          eventMessage: '待推送订单',
          businessId: orderId,
          // 其他必要字段赋值
          businessTitle: title,
          businessStatus: orderMain.orderStatus,
          businessMessage: orderMain.remark,
          createdTime: dayjs().toDate(),
          lastOperateProgram: thisContext,
        });
        await orderEventRepo.insert(newEvent);

        // 更新订单状态为“推送中”
        await orderMainRepo.update(orderId, {
          orderStatus: String(OrderStatusEnum.PUSHING),
          reviserId: user.userId,
          reviserName: user.username,
          lastOperateProgram: thisContext,
        });

        // 记录操作日志
        const logInput = OrderLogHelper.getOrderOperate(
          user,
          OrderOperateTemplateEnum.PUSH_ORDER_PAYMENT,
          thisContext,
          orderId,
        );
        logInput.params = { orderId: orderId };
        this._businessLogService.writeLog(logInput);

        this._logger.log(
          `Created new order push event for orderId=${orderId}, eventId=${newEvent.id}`,
          thisContext,
        );

        await queryRunner.commitTransaction();
        return newEvent;
      }
    } catch (err) {
      // mysql 唯一键冲突错误处理
      if (err.code === 'ER_DUP_ENTRY') {
        // 已存在未处理的推送事件，重新查询并返回
        const repo = queryRunner.manager.getRepository(OrderEventEntity);
        const existingEvent = await repo.findOne({
          where: {
            businessId: orderId,
            eventType: OrderEventTypeEnum.ORDER_PUSH,
            eventStatus: OrderEventStatusEnum.PENDING,
          },
        });
        await queryRunner.commitTransaction();
        return existingEvent;
      }

      await queryRunner.rollbackTransaction();

      this._logger.error(
        `Failed to create order push event for orderId=${orderId}: ${
          err.message
        }, ${JSON.stringify(err)}`,
        thisContext,
      );

      if (err instanceof BusinessException) {
        throw err;
      } else {
        throw new BusinessException('未能创建订单推送事件');
      }
    } finally {
      await queryRunner.release();
    }
  }
}
