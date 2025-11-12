import { Column, Entity } from 'typeorm';

@Entity('customer_credit_flow_detail')
export class CustomerCreditLimitDetail {
  @Column('bigint', { primary: true, name: 'id', comment: '主键id' })
  id: string;

  @Column('bigint', { name: 'customer_id', comment: '客户ID' })
  customerId: string;

  @Column('varchar', {
    name: 'customer_name',
    comment: '客户名称',
    length: 128,
  })
  customerName: string;

  @Column('int', {
    name: 'status',
    nullable: true,
    comment: '流水状态，-1冻结1已扣减2已关闭',
    default: () => "'-1'",
  })
  status: number | null;

  @Column('varchar', { name: 'flow_code', comment: '流水编号', length: 128 })
  flowCode: string;

  @Column('varchar', { name: 'order_id', comment: '内部订单ID', length: 128 })
  orderId: string;

  @Column('varchar', {
    name: 'online_order_id',
    comment: '聚水潭线上订单号',
    length: 128,
  })
  onlineOrderId: string;

  @Column('decimal', {
    name: 'shipped_amount',
    nullable: true,
    comment: '发货金额 = 订单金额，元',
    precision: 12,
    scale: 2,
  })
  shippedAmount: string | null;

  @Column('decimal', {
    name: 'auxiliary_sale_goods_amount',
    nullable: true,
    comment: '3%辅销品金额，元',
    precision: 12,
    scale: 2,
  })
  auxiliarySaleGoodsAmount: string | null;

  @Column('decimal', {
    name: 'replenishing_goods_amount',
    nullable: true,
    comment: '10%货补金额，元',
    precision: 12,
    scale: 2,
  })
  replenishingGoodsAmount: string | null;

  @Column('decimal', {
    name: 'used_auxiliary_sale_goods_amount',
    nullable: true,
    comment: '已提辅销金额，元',
    precision: 12,
    scale: 2,
  })
  usedAuxiliarySaleGoodsAmount: string | null;

  @Column('decimal', {
    name: 'remain_auxiliary_sale_goods_amount',
    nullable: true,
    comment: '剩余辅销金额，元',
    precision: 12,
    scale: 2,
  })
  remainAuxiliarySaleGoodsAmount: string | null;

  @Column('decimal', {
    name: 'used_replenishing_goods_amount',
    nullable: true,
    comment: '已提货补金额，元',
    precision: 12,
    scale: 2,
  })
  usedReplenishingGoodsAmount: string | null;

  @Column('decimal', {
    name: 'remain_replenishing_goods_amount',
    nullable: true,
    comment: '剩余货补金额，元',
    precision: 12,
    scale: 2,
  })
  remainReplenishingGoodsAmount: string | null;

  @Column('varchar', {
    name: 'payable_voucher',
    nullable: true,
    comment: '回款凭证，预留用于记录回款截图',
    length: 255,
  })
  payableVoucher: string | null;

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
}
