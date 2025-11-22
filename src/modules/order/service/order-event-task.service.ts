import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderPushService } from './order-push.service';
import * as config from 'config';
import { randomUUID } from 'crypto';
import {
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

@Injectable()
export class OrderEventTaskService {
  private readonly _logger = new Logger(OrderEventTaskService.name);

  private static readonly BATCH_SIZE = 5; // 每次处理的最大订单事件数量
  private static readonly EARLIEST_TIME = 'DATE_SUB(NOW(), INTERVAL 5 DAY)'; // 最早处理时间点，防止处理过旧的事件
  private static readonly LATEST_TIME = 'DATE_SUB(NOW(), INTERVAL 30 MINUTE)'; // 最晚处理时间点，防止处理过新的事件

  private readonly _maxEventBatchSize = OrderEventTaskService.BATCH_SIZE;
  private readonly _earliestTime: string = OrderEventTaskService.EARLIEST_TIME;
  private readonly _latestTime: string = OrderEventTaskService.LATEST_TIME;

  constructor(
    private readonly _dataSource: DataSource,
    private readonly _orderPushService: OrderPushService,
  ) {
    if (config.has('orderEventTask')) {
      const eventTaskConfig = config.get('orderEventTask');
      if (eventTaskConfig.maxEventBatchSize) {
        this._maxEventBatchSize = eventTaskConfig.maxEventBatchSize;
      }

      // 配置格式为可读的字符串，转换为 SQL 可识别的时间表达式
      if (eventTaskConfig.earliestTime) {
        this._earliestTime = `DATE_SUB(NOW(), INTERVAL ${eventTaskConfig.earliestTime})`;
      }
      if (eventTaskConfig.latestTime) {
        this._latestTime = `DATE_SUB(NOW(), INTERVAL ${eventTaskConfig.latestTime})`;
      }
    }
  }

  async _getPendingOrderEventsBatch(): Promise<OrderEventMainInfo[]> {
    const result = await this._dataSource
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
      .andWhere(`event.createdTime >=  ${this._earliestTime}`)
      .andWhere(`event.createdTime <= ${this._latestTime}`)
      .orderBy('event.createdTime', 'ASC')
      .limit(this._maxEventBatchSize)
      .getRawMany<OrderEventMainInfo>();
    return result;
  }

  async _processOrderEvent(eventInfo: OrderEventMainInfo): Promise<void> {
    const user: JwtUserPayload = {
      userId: '1',
      username: 'admin',
      nickName: '系统自动任务',
    };
    switch (eventInfo.eventType) {
      case OrderEventTypeEnum.ORDER_PUSH:
        await this._orderPushService.handleOrderPushEvent(eventInfo, user);
        break;
      default:
        throw new BusinessException(
          `未知的订单事件类型: ${eventInfo.eventType}`,
        );
    }
  }

  /**
   * 订单事件任务
   *
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

    const processedResult: ProcessedResult = {
      processedCount: 0,
      failedCount: 0,
      processedTime: 0,
      message: '',
    };

    // 查询所有待处理的订单事件
    let pendingEvents: OrderEventMainInfo[] = [];
    try {
      pendingEvents = await this._getPendingOrderEventsBatch();
      this._logger.log(
        `[${taskId}] 查询到待处理订单事件数量=${pendingEvents.length}`,
        thisContext,
      );
      this._logger.debug(
        `[${taskId}] 待处理订单事件列表: ${JSON.stringify(pendingEvents)}`,
        thisContext,
      );
    } catch (err) {
      this._logger.error(
        `[${taskId}] 查询待处理订单事件出错: ${err.message}`,
        err?.stack,
        thisContext,
      );
      processedResult.message = '查询待处理订单事件失败';
      return processedResult;
    }

    // 逐个处理订单事件
    for (const eventInfo of pendingEvents) {
      try {
        await this._processOrderEvent(eventInfo);
        processedResult.processedCount += 1;
      } catch (err) {
        this._logger.error(
          `[${taskId}] 处理订单事件 id=${eventInfo.id} 出错: ${err.message}`,
          err?.stack,
          thisContext,
        );
        processedResult.failedCount += 1;
        continue;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    processedResult.processedTime = duration;
    processedResult.message =
      `完成订单事件任务，` +
      ` 成功处理 ${processedResult.processedCount} 个，失败 ${processedResult.failedCount} 个`;
    this._logger.log(
      `[${taskId}] 完成订单事件任务处理，耗时 ${duration} 毫秒`,
      thisContext,
    );

    return processedResult;
  }
}
