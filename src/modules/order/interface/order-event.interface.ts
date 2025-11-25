import { EntityManager } from 'typeorm';
import { OrderEventStatusEnum } from '../service/order-event/order-event.constant';

export interface UpdateEventStatusDto {
  eventId: string;
  status: OrderEventStatusEnum;
  message: string;
  lastOperateProgram: string;
  businessStatus?: string;
  businessMessage?: string;
  manager?: EntityManager;
}
