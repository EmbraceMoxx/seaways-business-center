import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commodity_info')
export class CommodityInfoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '商品ID' })
  id: string;

  @Column('varchar', {
    name: 'commodity_name',
    comment: '商品名称',
    length: 200,
  })
  commodityName: string;

  @Column('varchar', {
    name: 'commodity_alia_name',
    comment: '商品简称',
    length: 200,
  })
  commodityAliaName: string;

  @Column('varchar', {
    name: 'commodity_code',
    comment: '业务中台内部商品编码',
    length: 128,
  })
  commodityCode: string;

  @Column('bigint', {
    name: 'commodity_first_category',
    nullable: true,
    comment: '商品一级分类ID',
  })
  commodityFirstCategory: string | null;

  @Column('bigint', {
    name: 'commodity_second_category',
    nullable: true,
    comment: '商品二级分类ID',
  })
  commoditySecondCategory: string | null;

  @Column('varchar', {
    name: 'commodity_internal_code',
    nullable: true,
    comment: '商品内部编码,与金蝶匹配',
    length: 100,
  })
  commodityInternalCode: string | null;

  @Column('varchar', {
    name: 'commodity_barcode',
    nullable: true,
    comment: '商品条码,与69码匹配',
    length: 100,
  })
  commodityBarcode: string | null;

  @Column('varchar', {
    name: 'item_spec_piece',
    nullable: true,
    comment: '单件规格',
    length: 128,
  })
  itemSpecPiece: string | null;

  @Column('varchar', {
    name: 'item_spec_unit',
    nullable: true,
    comment: '单品规格单位',
    length: 10,
  })
  itemSpecUnit: string | null;

  @Column('varchar', {
    name: 'item_min_spec_unit',
    nullable: true,
    comment: '单品最小计价单位',
    length: 10,
  })
  itemMinSpecUnit: string | null;

  @Column('varchar', {
    name: 'item_spec_info',
    nullable: true,
    comment: '单品规格信息=单件规格+单品规格单位',
    length: 500,
  })
  itemSpecInfo: string | null;

  @Column('int', {
    name: 'box_spec_piece',
    nullable: true,
    comment: '箱包装规格',
  })
  boxSpecPiece: number | null;

  @Column('varchar', {
    name: 'box_spec_info',
    nullable: true,
    comment: '箱规信息',
    length: 500,
  })
  boxSpecInfo: string | null;

  @Column('decimal', {
    name: 'item_ex_factory_price',
    nullable: true,
    comment: '单品出厂价（元）',
    precision: 10,
    scale: 2,
  })
  itemExFactoryPrice: string | null;

  @Column('decimal', {
    name: 'item_suggested_price',
    nullable: true,
    comment: '单品建议零售价（元）',
    precision: 10,
    scale: 2,
  })
  itemSuggestedPrice: string | null;

  @Column('decimal', {
    name: 'item_min_retail_price',
    nullable: true,
    comment: '单品最低零售价（元）',
    precision: 10,
    scale: 2,
  })
  itemMinRetailPrice: string | null;

  @Column('decimal', {
    name: 'item_min_retail_discount',
    nullable: true,
    comment: '单品最低零售折扣（%）',
    precision: 5,
    scale: 2,
  })
  itemMinRetailDiscount: string | null;

  @Column('decimal', {
    name: 'item_min_controlled_discount',
    nullable: true,
    comment: '单品最低控价零售折扣（%）',
    precision: 5,
    scale: 2,
  })
  itemMinControlledDiscount: string | null;

  @Column('decimal', {
    name: 'box_ex_factory_price',
    nullable: true,
    comment: '单箱出厂价（元）',
    precision: 10,
    scale: 2,
  })
  boxExFactoryPrice: string | null;

  @Column('decimal', {
    name: 'box_min_retail_price',
    nullable: true,
    comment: '单箱最低零售价（元）',
    precision: 10,
    scale: 2,
  })
  boxMinRetailPrice: string | null;

  @Column('decimal', {
    name: 'box_min_wholesale_price',
    nullable: true,
    comment: '单箱最低整件价（元）',
    precision: 10,
    scale: 2,
  })
  boxMinWholesalePrice: string | null;

  @Column('varchar', {
    name: 'description',
    nullable: true,
    comment: '商品描述',
    length: 1024,
  })
  description: string | null;

  @Column('varchar', {
    name: 'material',
    nullable: true,
    comment: '商品材质',
    length: 1024,
  })
  material: string | null;

  @Column('varchar', {
    name: 'commodity_image',
    comment: '商品图片，预留字段',
    length: 1024,
  })
  commodityImage: string;

  @Column('int', {
    name: 'is_combination',
    nullable: true,
    comment: '是否组合商品，1-是，0-否',
    default: () => "'0'",
  })
  isCombination: number | null;

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

  @Column('decimal', {
    name: 'gift_ex_factory_price',
    nullable: true,
    comment: '作为赠品的出厂价（元）',
    precision: 10,
    scale: 2,
  })
  giftExFactoryPrice: string | null;

  @Column('int', {
    name: 'is_bundled_products',
    nullable: true,
    comment: '是否组合商品，即多个不同单品组合0-否,1-是',
    default: () => "'0'",
  })
  isBundledProducts: number | null;

  @Column('int', {
    name: 'is_offline_sales',
    nullable: true,
    comment: '是否为线下销售商品，1-是，0-否',
    default: () => "'1'",
  })
  isOfflineSales: number | null;

  @Column('int', {
    name: 'is_default',
    nullable: true,
    comment: '默认可选产品，1-是，0-否',
    default: () => "'1'",
  })
  isDefault: number | null;

  @Column('varchar', {
    name: 'status',
    nullable: true,
    comment: '商品状态：1-上架，0-下架，2-停产',
    length: 20,
    default: () => "'1'",
  })
  status: string | null;

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

  // 组合商品id
  compositeCommodity?: string;
}
