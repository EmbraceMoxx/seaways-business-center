export enum OrderStatusEnum {
  /** 省区审批中 */
  PROVINCE_REVIEWING = '2000101',
  /** 大区审批中 */
  REGION_REVIEWING = '2000102',
  /** 总监审批中 */
  DIRECTOR_REVIEWING = '2000103',
  /** 待回款 */
  // PENDING_PAYMENT = '20002',
  /** 待推单 */
  PENDING_PUSH = '20003',
  /** 推单中 */
  PUSHING = '2000301',
  /** 已推单 */
  PUSHED = '20004',
  /** 已发货 */
  DELIVERED = '20005',
  /** 已驳回 */
  REJECTED = '20006',
  /** 已关闭 */
  CLOSED = '20009',
}

/**
 * 订单状态对应描述
 */
export const OrderStatusEnumText = {
  '2000101': '省区审批中',
  '2000102': '大区审批中',
  '2000103': '总监审批中',
  '20003': '待推单',
  '2000301': '推单中',
  '20004': '已推单',
  '20005': '已发货',
  '20006': '已驳回',
  '20009': '已关闭',
};
