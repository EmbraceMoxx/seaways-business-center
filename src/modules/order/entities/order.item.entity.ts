import { Column, Entity, Index } from 'typeorm';

@Index('idx_order_type', ['orderId', 'type'], {})
@Index('idx_commodity_id', ['commodityId'], {})
@Index('idx_internal_code', ['internalCode'], {})
@Index('idx_created_time', ['createdTime'], {})
@Entity({
  name: 'order_item',
  engine: 'InnoDB',
  comment: '订单明细项表',
  database: 'seaways_base_business_center',
  synchronize: false,
})
export class OrderItemEntity {
  @Column('bigint', {
    primary: true,
    name: 'id',
    comment: '订单明细项ID 雪花算法生成',
  })
  id: string;

  @Column('bigint', { name: 'order_id', comment: '订单ID' })
  orderId: string;

  @Column('varchar', {
    name: 'type',
    comment:
      '订单项类型：FINISHED_PRODUCT-成品商品，REPLENISH_PRODUCT-货补商品，AUXILIARY_SALES_PRODUCT-辅销商品',
    length: 32,
  })
  type: string;

  @Column('bigint', { name: 'commodity_id', comment: '商品ID' })
  commodityId: string;

  @Column('varchar', { name: 'name', comment: '商品名称', length: 200 })
  name: string;

  @Column('varchar', { name: 'alias_name', comment: '商品简称', length: 200 })
  aliasName: string;

  @Column('varchar', {
    name: 'internal_code',
    nullable: true,
    comment: '商品内部编码, 与ERP匹配',
    length: 100,
  })
  internalCode: string | null;

  @Column('varchar', {
    name: 'commodity_barcode',
    nullable: true,
    comment: '商品条形码',
    length: 128,
  })
  commodityBarcode: string | null;

  @Column('varchar', {
    name: 'remark',
    nullable: true,
    comment: '备注信息',
    length: 255,
  })
  remark: string | null;

  @Column('varchar', {
    name: 'spec_info',
    nullable: true,
    comment: '单品规格信息',
    length: 500,
  })
  specInfo: string | null;

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
    name: 'ex_factory_price',
    nullable: true,
    comment: '单品出厂价（元）',
    precision: 10,
    scale: 2,
  })
  exFactoryPrice: string | null;

  @Column('decimal', {
    name: 'ex_factory_box_price',
    nullable: true,
    comment: '单箱出厂价（元）',
    precision: 10,
    scale: 2,
  })
  exFactoryBoxPrice: string | null;

  @Column('int', {
    name: 'is_quota_involved',
    comment: '是否参与额度计算，1-是，0-否',
    default: () => 0,
  })
  isQuotaInvolved: number;

  @Column('int', { name: 'box_qty', comment: '商品箱数' })
  boxQty: number;

  @Column('int', { name: 'qty', comment: '商品数量（单品数量）' })
  qty: number;

  @Column('decimal', {
    name: 'amount',
    comment: '商品总价，单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  amount: string;

  @Column('decimal', {
    name: 'replenish_amount',
    comment: '货补金额，单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  replenishAmount: string;

  @Column('decimal', {
    name: 'auxiliary_sales_amount',
    comment: '辅销金额，单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  auxiliarySalesAmount: string;

  @Column('varchar', {
    name: 'deleted',
    comment: '是否删除，YES-删除，NO-未删除',
    length: 10,
    default: () => "'NO'",
  })
  deleted: string;

  @Column('bigint', { name: 'creator_id', comment: '创建人ID' })
  creatorId: string;

  @Column('varchar', {
    name: 'creator_name',
    comment: '创建人名字',
    length: 255,
  })
  creatorName: string;

  @Column('datetime', {
    name: 'created_time',
    comment: '创建时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdTime: Date;

  @Column('bigint', { name: 'reviser_id', nullable: true, comment: '修改人ID' })
  reviserId: string | null;

  @Column('datetime', {
    name: 'revised_time',
    nullable: true,
    comment: '修改时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  revisedTime: Date | null;

  @Column('varchar', {
    name: 'reviser_name',
    nullable: true,
    comment: '更新人名字',
    length: 255,
  })
  reviserName: string | null;

  @Column('varchar', {
    name: 'last_operate_program',
    comment: '最后操作的程序',
    length: 128,
  })
  lastOperateProgram: string;
}
