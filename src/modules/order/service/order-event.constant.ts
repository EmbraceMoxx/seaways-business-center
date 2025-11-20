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

export const JST_ORDER_STATUS = {
  WAIT_SELLER_SEND_GOODS: 'WAIT_SELLER_SEND_GOODS',
};
