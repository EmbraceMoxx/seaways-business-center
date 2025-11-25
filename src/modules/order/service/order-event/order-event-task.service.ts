import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as config from 'config';
import * as dayjs from 'dayjs';
import { randomUUID } from 'crypto';
import {
  EventExecuteResult,
  OrderEventMainInfo,
  ProcessedResult,
} from '../../interface/order-event-task.interface';
import { OrderEventEntity } from '../../entities/order.event.entity';
import { OrderEventStatusEnum } from './order-event.constant';
import { BusinessException } from '@src/dto';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import { OrderEventService } from './order-event.service';
import { EventExecutorRegistry } from './event-executor.registry';

@Injectable()
export class OrderEventTaskService {
  private readonly _logger = new Logger(OrderEventTaskService.name);

  private static readonly BATCH_SIZE = 5; // 每次处理的最大订单事件数量
  private static readonly EARLIEST_TIME = '5 day'; // 最早处理时间点，防止处理过旧的事件
  private static readonly LATEST_TIME = '30 minute'; // 最晚处理时间点，防止处理过新的事件
  private static readonly INTERVAL_REGEX = /^\d+\s+(day|hour|minute)$/i;

  private _maxEventBatchSize = OrderEventTaskService.BATCH_SIZE;
  private _earliestTime: string = OrderEventTaskService.EARLIEST_TIME;
  private _earliestTimeValue = 5;
  private _earliestTimeUnit = 'day';
  private _latestTime: string = OrderEventTaskService.LATEST_TIME;
  private _latestTimeValue = 30;
  private _latestTimeUnit = 'minute';

  constructor(
    private readonly _dataSource: DataSource,
    private readonly _executorRegistry: EventExecutorRegistry,
    private readonly _orderEventService: OrderEventService,
  ) {
    if (config.has('orderEventTask')) {
      const taskConfig = config.get('orderEventTask');
      this._maxEventBatchSize =
        taskConfig.maxEventBatchSize ?? this._maxEventBatchSize;

      if (
        taskConfig.earliestTime &&
        OrderEventTaskService.INTERVAL_REGEX.test(taskConfig.earliestTime)
      ) {
        const temp = taskConfig.earliestTime.split(' ');
        this._earliestTimeValue = Number(temp[0]);
        this._earliestTimeUnit = temp[1].toLowerCase();
      }

      if (
        taskConfig.latestTime &&
        OrderEventTaskService.INTERVAL_REGEX.test(taskConfig.latestTime)
      ) {
        const temp = taskConfig.latestTime.split(' ');
        this._latestTimeValue = Number(temp[0]);
        this._latestTimeUnit = temp[1].toLowerCase();
      }
    }
  }

  private _getEarliestTime(): string {
    return dayjs()
      .subtract(
        this._earliestTimeValue,
        this._earliestTimeUnit as dayjs.ManipulateType,
      )
      .format('YYYY-MM-DD HH:mm:ss');
  }

  private _getLatestTime(): string {
    return dayjs()
      .subtract(
        this._latestTimeValue,
        this._latestTimeUnit as dayjs.ManipulateType,
      )
      .format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 获取待处理的订单事件批次
   * @return 待处理的订单事件信息数组
   */
  async _getPendingOrderEventsBatch(
    startTime: string,
    endTime: string,
  ): Promise<OrderEventMainInfo[]> {
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
        .andWhere(`event.createdTime >= :startTime`, {
          startTime,
        })
        .andWhere(`event.createdTime <= :endTime`, {
          endTime,
        })
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

      const updateResult = await queryRunner.manager
        .getRepository(OrderEventEntity)
        .createQueryBuilder()
        .update()
        .set({
          eventStatus: OrderEventStatusEnum.PROCESSING,
          eventMessage: '事件处理中（任务锁定）',
        })
        .where('id IN (:...ids)', { ids })
        .andWhere('eventStatus = :status', {
          status: String(OrderEventStatusEnum.PENDING),
        })
        .execute();

      if (updateResult.affected !== ids.length) {
        this._logger.warn(
          `部分事件未能更新为 PROCESSING，可能被其他实例抢占`,
          thisContext,
        );
        throw new Error('部分事件未能正确更新状态');
      }

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
  ): Promise<EventExecuteResult> {
    const user: JwtUserPayload = {
      userId: '1',
      username: 'admin',
      nickName: '系统自动任务',
    };

    try {
      const executor = this._executorRegistry.get(eventInfo.eventType);
      if (!executor) {
        await this._updateEventStatus(
          eventInfo.id,
          OrderEventStatusEnum.ERROR,
          `未找到事件类型对应的处理器: ${eventInfo.eventType}`,
        );
        return { success: false, message: '未找到事件类型对应的处理器' };
      }

      const result = await executor.execute(eventInfo, user);
      // 更新事件状态
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

    this._earliestTime = this._getEarliestTime();
    this._latestTime = this._getLatestTime();
    this._logger.log(
      `[${taskId}] 开始订单事件任务，配置：最大批处理数量=${this._maxEventBatchSize}，` +
        ` 最早处理事件时间= '${this._earliestTime}' ，最晚处理事件时间='${this._latestTime}'`,
      thisContext,
    );

    // 查询待处理的订单事件批次
    let pendingEvents: OrderEventMainInfo[] = [];
    pendingEvents = await this._getPendingOrderEventsBatch(
      this._earliestTime,
      this._latestTime,
    );

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
      `业务错误 ${processedResult.businessFailedCount} 个。`;
    this._logger.log(
      `[${taskId}] ${processedResult.message}, 耗时 ${duration} 毫秒`,
      thisContext,
    );

    if (
      processedResult.exceptionCount > 0 ||
      processedResult.businessFailedCount > 0
    ) {
      this._logger.warn(`[${taskId}] 存在订单事件未能处理成功`, thisContext);
    }

    return processedResult;
  }
}
