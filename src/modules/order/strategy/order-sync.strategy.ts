import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import * as dayjs from 'dayjs';
import { OrderSyncCancelService } from '@modules/order/strategy/order-sync-cancel.service';

/** 单个操作策略需要的行为定义 */
interface IOperateStrategy {
  /** 当前操作允许的起始状态 */
  fromStatus: OrderStatusEnum;
  /** 要变更到的目标状态 */
  toStatus: OrderStatusEnum;
  /** 模板枚举（用来生成日志） */
  logTemplate: OrderOperateTemplateEnum;
  /** 订单实体上要附加的额外字段 */
  extraPayload?(orderCode: string): Partial<OrderMainEntity>;
  /** 副作用服务类列表（可选）*/
  sideEffects?: Array<{ new (...args: any[]): any }>;
}
/** 操作类型 → 策略映射表 */
export const OPERATE_STRATEGY = new Map<number, IOperateStrategy>([
  [
    1,
    {
      // 发货
      fromStatus: OrderStatusEnum.PUSHED,
      toStatus: OrderStatusEnum.DELIVERED,
      logTemplate: OrderOperateTemplateEnum.DELIVERY_ORDER,
      extraPayload: () => ({
        deliveryTime: dayjs().toDate(),
      }),
    },
  ],
  [
    2,
    {
      // 取消
      fromStatus: OrderStatusEnum.PUSHED,
      toStatus: OrderStatusEnum.CLOSED,
      logTemplate: OrderOperateTemplateEnum.CLOSE_ORDER,
      extraPayload: () => ({
        cancelledMessage: '聚水潭ERP端取消订单',
      }),
      sideEffects: [OrderSyncCancelService],
    },
  ],
]);
