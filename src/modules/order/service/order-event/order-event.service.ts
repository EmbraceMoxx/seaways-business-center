import { Injectable, Logger } from '@nestjs/common';
import { OrderEventEntity } from '../../entities/order.event.entity';
import { DataSource } from 'typeorm';
import {
  OrderEventStatusEnum,
  OrderEventTypeEnum,
} from './order-event.constant';
import { BusinessException } from '@src/dto';
import { OrderMainEntity } from '../../entities/order.main.entity';
import { generateId } from '@src/utils';
import * as dayjs from 'dayjs';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import { OrderLogHelper } from '../../helper/order.log.helper';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { BusinessLogService } from '@src/modules/common/business-log/business-log.service';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { UpdateEventStatusDto } from '../../interface/order-event.interface';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

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
          deleted: GlobalStatusEnum.NO,
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
          where: { id: orderId, deleted: GlobalStatusEnum.NO },
        });

        if (!orderMain) {
          this._logger.warn(
            `Order not found when creating push event, orderId=${orderId}`,
            thisContext,
          );
          throw new BusinessException(`未找到订单`);
        }

        // 检查订单状态，待推送或推送中(推送出错重新创建)才允许创建推送事件
        if (
          orderMain.orderStatus !== String(OrderStatusEnum.PENDING_PUSH) &&
          orderMain.orderStatus !== String(OrderStatusEnum.PUSHING)
        ) {
          this._logger.warn(
            `Order status not valid for push event, orderId=${orderId}, status=${orderMain.orderStatus}`,
            thisContext,
          );
          throw new BusinessException(`订单状态不允许推送`);
        }

        // 线上订单号使用唯一编码 orderMain.orderCode
        const title = `线上订单号：${orderMain.orderCode}，客户：${orderMain.customerName}`;
        const newEvent = orderEventRepo.create({
          id: generateId(),
          eventType: OrderEventTypeEnum.ORDER_PUSH,
          eventStatus: OrderEventStatusEnum.PENDING,
          eventMessage: '待推送订单',
          businessId: orderId,
          // 其他必要字段赋值
          businessTitle: title,
          businessStatus: orderMain.orderStatus, // 创建时业务状态为订单当前状态
          businessMessage: orderMain.remark,
          createdTime: dayjs().toDate(),
          lastOperateProgram: thisContext,
        });
        await orderEventRepo.insert(newEvent);

        // 更新订单状态为“推送中”
        await orderMainRepo.update(orderId, {
          orderStatus: String(OrderStatusEnum.PUSHING),
          reviserId: user.userId,
          reviserName: user.nickName,
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
        await this._businessLogService.writeLog(logInput, queryRunner.manager);

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
            deleted: GlobalStatusEnum.NO,
          },
        });

        await queryRunner.commitTransaction();

        if (existingEvent) {
          this._logger.warn(
            `Order push event already exists for orderId=${orderId}`,
            thisContext,
          );
          return existingEvent;
        }

        this._logger.error(
          `Duplicate entry error occurred but no existing event found for orderId=${orderId}`,
          thisContext,
        );
        throw new BusinessException('存在未处理订单推送事件');
      }

      await queryRunner.rollbackTransaction();

      this._logger.error(
        `Failed to create order push event for orderId=${orderId}: ${err.message}`,
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

  /**
   * 更新订单事件状态
   */
  async updateEventStatus(updateDto: UpdateEventStatusDto): Promise<number> {
    const {
      eventId,
      status,
      message,
      lastOperateProgram,
      businessStatus,
      businessMessage,
      manager,
    } = updateDto;

    const repo = manager
      ? manager.getRepository(OrderEventEntity)
      : this._dataSource.getRepository(OrderEventEntity);

    const updateData: QueryDeepPartialEntity<OrderEventEntity> = {
      eventStatus: status,
      eventMessage: message,
      lastOperateProgram,
    };

    if (businessStatus !== undefined)
      updateData.businessStatus = businessStatus;
    if (businessMessage !== undefined)
      updateData.businessMessage = businessMessage;

    const result = await repo.update({ id: eventId }, updateData);
    return result.affected || 0;
  }

  async findEventById(eventId: string): Promise<OrderEventEntity | null> {
    const repo = this._dataSource.getRepository(OrderEventEntity);
    const event = repo.findOne({
      where: { id: eventId, deleted: GlobalStatusEnum.NO },
    });
    return event;
  }
}
