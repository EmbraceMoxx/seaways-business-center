/**
 * 订单项类型枚举
 * 用于区分订单中的不同商品类型
 */
export enum CommodityClassifyTypeEnum {
  /** 成品商品 */
  FINISHED_PRODUCT = '1',
  /** 货补商品 */
  REPLENISH_PRODUCT = '3',
  /** 辅销商品 */
  AUXILIARY_SALES_PRODUCT = '2',
}
