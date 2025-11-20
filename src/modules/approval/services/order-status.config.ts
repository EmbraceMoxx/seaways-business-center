import { OrderStatusEnum } from '@src/enums/order-status.enum';

// 不允许重新提交的状态及其原因
const BLOCKED_RESUBMIT_STATUSES = {
  [OrderStatusEnum.PUSHING]: '订单正在推单中，无法重新提交审批',
  [OrderStatusEnum.PUSHED]: '订单已推单，无法重新提交审批',
  [OrderStatusEnum.DELIVERED]: '订单已发货，无法重新提交审批',
  [OrderStatusEnum.CLOSED]: '订单已关闭，无法重新提交审批',
};

// 检查状态是否允许重新提交
export const isResubmitAllowed = (status: OrderStatusEnum | string): boolean =>
  !(status in BLOCKED_RESUBMIT_STATUSES);

// 获取状态限制消息
export const getResubmitMessage = (status: OrderStatusEnum | string): string =>
  BLOCKED_RESUBMIT_STATUSES[status] || '当前订单状态不允许重新提交审批';
