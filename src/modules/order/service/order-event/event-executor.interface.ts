import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import {
  EventExecuteResult,
  OrderEventMainInfo,
} from '../../interface/order-event-task.interface';

export interface OrderEventExecutor {
  /**
   * 返回该执行器支持的 eventType，如 "ORDER_PUSH"
   */
  getEventType(): string;

  /**
   * 执行事件处理
   */
  execute(
    event: OrderEventMainInfo,
    user: JwtUserPayload,
  ): Promise<EventExecuteResult>;
}
