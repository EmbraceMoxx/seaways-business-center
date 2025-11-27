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
  /** 处理中 */
  PROCESSING = 3,
}

export const JST_ORDER_STATUS = {
  WAIT_SELLER_SEND_GOODS: 'WAIT_SELLER_SEND_GOODS',
};

export const ORDER_EVENT_USER = {
  USER_ID: '1',
  USERNAME: 'admin',
  NICK_NAME: '系统自动任务',
  IP_ADDRESS: '127.0.0.1',
};

export const ORDER_SERVICE_USER = {
  USER_ID: '1',
  USERNAME: 'admin',
  NICK_NAME: '系统服务',
  IP_ADDRESS: '127.0.0.1',
};
