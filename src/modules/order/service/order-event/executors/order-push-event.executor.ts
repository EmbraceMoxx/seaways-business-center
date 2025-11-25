import { Injectable } from '@nestjs/common';
import { OrderEventExecutor } from '../event-executor.interface';
import { OrderPushService } from '../../order-push.service';
import {
  EventExecuteResult,
  OrderEventMainInfo,
} from '@src/modules/order/interface/order-event-task.interface';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';

export const EVENT_TYPE_ORDER_PUSH = 'ORDER_PUSH';

@Injectable()
export class OrderPushEventExecutor implements OrderEventExecutor {
  constructor(private readonly orderPushService: OrderPushService) {}

  getEventType(): string {
    return EVENT_TYPE_ORDER_PUSH;
  }

  async execute(
    event: OrderEventMainInfo,
    user: JwtUserPayload,
  ): Promise<EventExecuteResult> {
    return await this.orderPushService.handleOrderPushEvent(event, user);
  }
}
