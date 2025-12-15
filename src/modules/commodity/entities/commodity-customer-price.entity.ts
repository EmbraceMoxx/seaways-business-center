import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';

@Index('idx_commodity_id', ['commodityId'], {})
@Index('idx_customer_id', ['customerId'], {})
@Entity('commodity_customer_price_mapping', {
  schema: 'seaways_base_business_center',
})
export class CommodityCustomerPriceEntity {
  @Column('bigint', { primary: true, name: 'id', comment: 'ID' })
  id: string;

  @Column('bigint', { name: 'commodity_id', comment: '下单使用产品价格' })
  commodityId: string;

  @Column('varchar', {
    name: 'commodity_name',
    nullable: true,
    comment: '下单使用产品名称',
    length: 255,
  })
  commodityName: string | null;

  @Column('varchar', {
    name: 'commodity_internal_code',
    nullable: true,
    comment: '商品内部编码,与金蝶匹配',
    length: 100,
  })
  commodityInternalCode: string | null;

  @Column('bigint', { name: 'customer_id', comment: '客户ID' })
  customerId: string;

  @Column('decimal', {
    name: 'item_ex_factory_price',
    nullable: true,
    comment: '单品出厂价（元）',
    precision: 10,
    scale: 3,
  })
  itemExFactoryPrice: string | null;

  @Column('int', {
    name: 'is_supply_subsidy_involved',
    nullable: true,
    comment: '是否参与货补，1-是，0-否',
    default: () => "'0'",
  })
  isSupplySubsidyInvolved: number | null;

  @Column('int', {
    name: 'is_quota_involved',
    nullable: true,
    comment: '是否参与额度计算，1-是，0-否',
    default: () => "'0'",
  })
  isQuotaInvolved: number | null;

  @Column('int', {
    name: 'is_gift_eligible',
    nullable: true,
    comment: '是否可做赠品，1-是，0-否',
    default: () => "'0'",
  })
  isGiftEligible: number | null;

  @Column('varchar', {
    name: 'enabled',
    nullable: true,
    comment: '是否启用，YES-启用，NO-禁用',
    length: 10,
    default: () => "'YES'",
  })
  enabled: string | null;

  @Column('varchar', {
    name: 'deleted',
    nullable: true,
    comment: '是否删除，YES-删除，NO-未删除',
    length: 10,
    default: () => "'NO'",
  })
  deleted: string | null;

  @Column('bigint', { name: 'creator_id', nullable: true, comment: '创建人ID' })
  creatorId: string | null;

  @Column('datetime', {
    name: 'created_time',
    nullable: true,
    comment: '创建时间',
  })
  createdTime: Date | null;

  @Column('bigint', { name: 'reviser_id', nullable: true, comment: '修改人ID' })
  reviserId: string | null;

  @Column('datetime', {
    name: 'revised_time',
    nullable: true,
    comment: '修改时间',
  })
  revisedTime: Date | null;

  @Column('varchar', {
    name: 'creator_name',
    nullable: true,
    comment: '创建人名字',
    length: 255,
  })
  creatorName: string | null;

  @Column('varchar', {
    name: 'reviser_name',
    nullable: true,
    comment: '更新人名字',
    length: 255,
  })
  reviserName: string | null;

  @ManyToOne(() => CommodityInfoEntity)
  @JoinColumn({ name: 'commodity_id' })
  commodity: CommodityInfoEntity;
}
