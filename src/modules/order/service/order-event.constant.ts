export enum OrderEventTypeEnum {
  /** 订单推送事件 */
  ORDER_PUSH = 'ORDER_PUSH',
}

export enum OrderEventStatusEnum {
  /** 未开始 */
  PENDING = 0,
  /** 已完成 */
  COMPLETED = 1,
  /** 错误 */
  ERROR = 2,
}
