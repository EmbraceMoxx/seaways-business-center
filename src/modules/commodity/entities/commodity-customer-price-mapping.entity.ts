import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/**
 * 商品价格客户映射实体
 */
@Entity('commodity_customer_price_mapping')
@Index('idx_commodity_id', ['commodityId'])
@Index('idx_customer_id', ['customerId'])
export class CommodityCustomerPriceMappingEntity {
  /**
   * ID
   */
  @PrimaryColumn({ type: 'bigint', name: 'id', comment: 'ID' })
  id: string;

  /**
   * 下单使用产品价格对应的商品ID
   */
  @Column({ type: 'bigint', name: 'commodity_id', comment: '下单使用产品价格' })
  commodityId: string;

  /**
   * 商品内部编码,与金蝶匹配
   */
  @Column({ type: 'varchar', length: 100, name: 'commodity_internal_code', nullable: true, comment: '商品内部编码,与金蝶匹配' })
  commodityInternalCode?: string;

  /**
   * 客户ID
   */
  @Column({ type: 'bigint', name: 'customer_id', comment: '客户ID' })
  customerId: string;

  /**
   * 单品出厂价（元）
   */
  @Column({ type: 'decimal', precision: 10, scale: 3, name: 'item_ex_factory_price', nullable: true, comment: '单品出厂价（元）' })
  itemExFactoryPrice?: string;

  /**
   * 是否参与货补，1-是，0-否
   */
  @Column({ type: 'int', name: 'is_supply_subsidy_involved', default: 0, comment: '是否参与货补，1-是，0-否' })
  isSupplySubsidyInvolved: number = 0;

  /**
   * 是否参与额度计算，1-是，0-否
   */
  @Column({ type: 'int', name: 'is_quota_involved', default: 0, comment: '是否参与额度计算，1-是，0-否' })
  isQuotaInvolved: number = 0;

  /**
   * 是否可做赠品，1-是，0-否
   */
  @Column({ type: 'int', name: 'is_gift_eligible', default: 0, comment: '是否可做赠品，1-是，0-否' })
  isGiftEligible: number = 0;

  /**
   * 是否启用，YES-启用，NO-禁用
   */
  @Column({ type: 'varchar', length: 10, name: 'enabled', default: 'YES', comment: '是否启用，YES-启用，NO-禁用' })
  enabled: string = 'YES';

  /**
   * 是否删除，YES-删除，NO-未删除
   */
  @Column({ type: 'varchar', length: 10, name: 'deleted', default: 'NO', comment: '是否删除，YES-删除，NO-未删除' })
  deleted: string = 'NO';

  /**
   * 创建人ID
   */
  @Column({ type: 'bigint', name: 'creator_id', nullable: true, comment: '创建人ID' })
  creatorId?: number;

  /**
   * 创建时间
   */
  @Column({ type: 'datetime', name: 'created_time', nullable: true, comment: '创建时间' })
  createdTime?: Date;

  /**
   * 修改人ID
   */
  @Column({ type: 'bigint', name: 'reviser_id', nullable: true, comment: '修改人ID' })
  reviserId?: number;

  /**
   * 修改时间
   */
  @Column({ type: 'datetime', name: 'revised_time', nullable: true, comment: '修改时间' })
  revisedTime?: Date;

  /**
   * 创建人名字
   */
  @Column({ type: 'varchar', length: 255, name: 'creator_name', nullable: true, comment: '创建人名字' })
  creatorName?: string;

  /**
   * 更新人名字
   */
  @Column({ type: 'varchar', length: 255, name: 'reviser_name', nullable: true, comment: '更新人名字' })
  reviserName?: string;
}
