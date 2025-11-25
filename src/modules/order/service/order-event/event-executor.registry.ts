import { Injectable } from '@nestjs/common';
import { OrderEventExecutor } from './event-executor.interface';

@Injectable()
export class EventExecutorRegistry {
  private readonly executors = new Map<string, OrderEventExecutor>();

  constructor(executorList: OrderEventExecutor[]) {
    for (const executor of executorList) {
      const type = executor.getEventType();
      this.executors.set(type, executor);
    }
  }

  get(eventType: string): OrderEventExecutor {
    const executor = this.executors.get(eventType);
    if (!executor) {
      throw new Error(`Unsupported eventType: ${eventType}`);
    }
    return executor;
  }
}
