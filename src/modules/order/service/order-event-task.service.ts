import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderPushService } from './order-push.service';
import * as config from 'config';
import { randomUUID } from 'crypto';
import {
  BusinessResult,
  OrderEventMainInfo,
  ProcessedResult,
} from '../interface/order-event-task.interface';
import { OrderEventEntity } from '../entities/order.event.entity';
import {
  OrderEventStatusEnum,
  OrderEventTypeEnum,
} from './order-event.constant';
import { BusinessException } from '@src/dto';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import { OrderEventService } from './order-event.service';

@Injectable()
export class OrderEventTaskService {
  private readonly _logger = new Logger(OrderEventTaskService.name);

  private static readonly BATCH_SIZE = 5; // 每次处理的最大订单事件数量
  private static readonly EARLIEST_TIME = '5 DAY'; // 最早处理时间点，防止处理过旧的事件
  private static readonly LATEST_TIME = '30 MINUTE'; // 最晚处理时间点，防止处理过新的事件
  private static readonly INTERVAL_REGEX = /^\d+\s+(DAY|HOUR|MINUTE)$/i;

  private _maxEventBatchSize = OrderEventTaskService.BATCH_SIZE;
  private _earliestTime: string = OrderEventTaskService.EARLIEST_TIME;
  private _latestTime: string = OrderEventTaskService.LATEST_TIME;

  constructor(
    private readonly _dataSource: DataSource,
    private readonly _orderEventService: OrderEventService, // 用于更新事件状态

    private readonly _orderPushService: OrderPushService,
  ) {
    if (config.has('orderEventTask')) {
      const eventTaskConfig = config.get('orderEventTask');
      this._maxEventBatchSize =
        eventTaskConfig.maxEventBatchSize ?? this._maxEventBatchSize;

      if (
        eventTaskConfig.earliestTime &&
        OrderEventTaskService.INTERVAL_REGEX.test(eventTaskConfig.earliestTime)
      ) {
        this._earliestTime = eventTaskConfig.earliestTime;
      }

      if (
        eventTaskConfig.latestTime &&
        OrderEventTaskService.INTERVAL_REGEX.test(eventTaskConfig.latestTime)
      ) {
        this._latestTime = eventTaskConfig.latestTime ?? this._latestTime;
      }
    }
  }

  /**
   * 获取待处理的订单事件批次
   * @return 待处理的订单事件信息数组
   */
  async _getPendingOrderEventsBatch(): Promise<OrderEventMainInfo[]> {
    const thisContext = `${this.constructor.name}._getPendingOrderEventsBatch`;
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 查询待处理事件
      const result = await queryRunner.manager
        .getRepository(OrderEventEntity)
        .createQueryBuilder('event')
        .select([
          'event.id AS id',
          'event.eventType AS eventType',
          'event.businessId AS businessId',
        ])
        .where('event.eventStatus = :status', {
          status: String(OrderEventStatusEnum.PENDING),
        })
        .andWhere(
          `event.createdTime >= DATE_SUB(NOW(), INTERVAL ${this._earliestTime})`,
        )
        .andWhere(
          `event.createdTime <= DATE_SUB(NOW(), INTERVAL ${this._latestTime})`,
        )
        .orderBy('event.createdTime', 'ASC')
        .limit(this._maxEventBatchSize)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getRawMany<OrderEventMainInfo>();

      // 如果没有事件，直接返回
      if (result.length === 0) {
        await queryRunner.commitTransaction();
        return [];
      }

      // 2. 更新事件状态为 PROCESSING，防止重复处理
      const ids = result.map((e) => e.id);

      await queryRunner.manager
        .getRepository(OrderEventEntity)
        .createQueryBuilder()
        .update()
        .set({
          eventStatus: OrderEventStatusEnum.PROCESSING,
          eventMessage: '事件处理中（任务锁定）',
        })
        .where('id IN (:...ids)', { ids })
        .execute();

      // 3. 提交事务
      await queryRunner.commitTransaction();

      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this._logger.error(
        `获取待处理订单事件批次出错: ${err.message}`,
        err?.stack,
        thisContext,
      );
      throw new BusinessException('获取待处理订单事件批次出错');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新订单事件状态（统一出口）
   */
  private async _updateEventStatus(
    eventId: string,
    newStatus: OrderEventStatusEnum,
    message: string,
    businessStatus?: string,
    businessMessage?: string,
  ): Promise<void> {
    await this._orderEventService.updateEventStatus({
      eventId,
      status: newStatus,
      message,
      businessStatus,
      businessMessage,
      lastOperateProgram: 'OrderEventTaskService',
    });
  }

  /**
   * 处理单个订单事件
   * @param eventInfo 订单事件信息
   */
  async _processSingleEvent(
    eventInfo: OrderEventMainInfo,
  ): Promise<BusinessResult> {
    const user: JwtUserPayload = {
      userId: '1',
      username: 'admin',
      nickName: '系统自动任务',
    };

    try {
      let result: BusinessResult;

      // 调用不同的业务服务处理订单事件
      switch (eventInfo.eventType) {
        case OrderEventTypeEnum.ORDER_PUSH:
          result = await this._orderPushService.handleOrderPushEvent(
            eventInfo,
            user,
          );
          break;

        default:
          this._logger.warn(
            `未知的订单事件类型: ${eventInfo.eventType}，事件ID=${eventInfo.id}`,
            `${this.constructor.name}._processOrderEvent`,
          );
          await this._updateEventStatus(
            eventInfo.id,
            OrderEventStatusEnum.ERROR,
            `未知的订单事件类型: ${eventInfo.eventType}`,
          );
          throw new BusinessException(
            `未知的订单事件类型: ${eventInfo.eventType}`,
          );
      }

      // 根据处理结果更新订单事件状态
      if (result.success) {
        await this._updateEventStatus(
          eventInfo.id,
          OrderEventStatusEnum.COMPLETED,
          result.message,
          result.businessStatus,
          result.businessMessage,
        );
      } else {
        await this._updateEventStatus(
          eventInfo.id,
          OrderEventStatusEnum.ERROR,
          result.message,
          result.businessStatus,
          result.businessMessage,
        );
      }

      return result;
    } catch (err) {
      // 处理过程中出现错误，更新事件状态为 ERROR
      await this._updateEventStatus(
        eventInfo.id,
        OrderEventStatusEnum.ERROR,
        `处理订单事件异常: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * 订单事件任务
   */
  async orderEventTaskProcess(): Promise<ProcessedResult> {
    const thisContext = `${this.constructor.name}.orderEventTaskProcess`;
    const taskId = randomUUID();
    const startTime = Date.now(); // 记录任务开始时间，以便后续计算执行时长
    this._logger.log(
      `[${taskId}] 开始订单事件任务，配置：最大批处理数量=${this._maxEventBatchSize}，` +
        ` 最早处理时间= '${this._earliestTime}' ，最晚处理时间='${this._latestTime}'`,
      thisContext,
    );

    // 查询待处理的订单事件批次
    let pendingEvents: OrderEventMainInfo[] = [];
    pendingEvents = await this._getPendingOrderEventsBatch();

    const processedResult: ProcessedResult = {
      processedCount: 0,
      exceptionCount: 0,
      businessSuccessCount: 0,
      businessFailedCount: 0,
      processedTime: 0,
      message: '',
    };

    // 统一处理订单事件
    for (const eventInfo of pendingEvents) {
      try {
        const result = await this._processSingleEvent(eventInfo);
        processedResult.processedCount++;
        if (result.success) {
          processedResult.businessSuccessCount++;
        } else {
          processedResult.businessFailedCount++;
        }
      } catch (err) {
        processedResult.exceptionCount++;
        this._logger.error(
          `[${taskId}] 处理订单事件 id=${eventInfo.id} 异常: ${err.message}`,
          err?.stack,
          thisContext,
        );
      }
    }

    // 记录任务结束时间，计算耗时
    const endTime = Date.now();
    const duration = endTime - startTime;
    processedResult.processedTime = duration;
    processedResult.message =
      `完成订单事件任务，` +
      `处理事件 ${processedResult.processedCount} 个，` +
      `处理异常 ${processedResult.exceptionCount} 个, ` +
      `业务成功 ${processedResult.businessSuccessCount} 个，` +
      `业务错误 ${processedResult.businessFailedCount} 个，`;
    this._logger.log(
      `[${taskId}] ${processedResult.message}, 耗时 ${duration} 毫秒`,
      thisContext,
    );

    if (processedResult.exceptionCount > 0) {
      this._logger.warn(`[${taskId}] 存在订单事件未能处理成功`, thisContext);
    }

    return processedResult;
  }
}
