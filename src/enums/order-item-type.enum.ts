/**
 * 订单项类型枚举
 * 用于区分订单中的不同商品类型
 */
export enum OrderItemTypeEnum {
  /** 成品商品 */
  FINISHED_PRODUCT = 'FINISHED_PRODUCT',
  /** 货补商品 */
  REPLENISH_PRODUCT = 'REPLENISH_PRODUCT',
  /** 辅销商品 */
  AUXILIARY_SALES_PRODUCT = 'AUXILIARY_SALES_PRODUCT',
  /** 补充商品 */
  APPENDED_PRODUCT = 'APPENDED_PRODUCT',
}
