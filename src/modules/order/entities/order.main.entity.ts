import { Column, Entity, Index } from 'typeorm';

@Index('uniq_order_code', ['orderCode'], { unique: true })
@Index('idx_online_order_code', ['onlineOrderCode'], {})
@Index('idx_ori_inner_order_code', ['oriInnerOrderCode'], {})
@Index('idx_customer_time', ['customerId', 'createdTime'], {})
@Index('idx_order_status', ['orderStatus'], {})
@Index('idx_created_time', ['createdTime'], {})
@Entity({
  name: 'order_main',
  engine: 'InnoDB',
  comment: '订单主表',
  database: 'seaways_base_business_center',
  synchronize: false,
})
export class OrderMainEntity {
  @Column('bigint', {
    primary: true,
    name: 'id',
    comment: '订单ID 雪花算法生成',
  })
  id: string;

  @Column('varchar', {
    name: 'order_code',
    unique: true,
    comment: '订单编号, 全局唯一，格式："XX" + YYYYMMDD + NNNNNN',
    length: 128,
  })
  orderCode: string;

  @Column('varchar', {
    name: 'online_order_code',
    nullable: true,
    comment: '线上订单号, 格式: "CCCCC"(业务代码) + YYYYMMDD + NNN',
    length: 128,
  })
  onlineOrderCode: string | null;

  @Column('bigint', {
    name: 'ori_inner_order_code',
    nullable: true,
    comment: '原内部单号(聚水潭内部单号)',
  })
  oriInnerOrderCode: string | null;

  @Column('varchar', { name: 'order_status', comment: '订单状态', length: 32 })
  orderStatus: string;

  @Column('varchar', {
    name: 'approval_reason',
    nullable: true,
    comment: '审核原因',
    length: 128,
  })
  approvalReason: string | null;

  @Column('varchar', {
    name: 'approval_remark',
    nullable: true,
    comment: '审核备注',
    length: 128,
  })
  approvalRemark: string | null;

  @Column('varchar', {
    name: 'cancelled_message',
    nullable: true,
    comment: '订单取消原因',
    length: 128,
  })
  cancelledMessage: string | null;

  @Column('datetime', {
    name: 'audit_time',
    nullable: true,
    comment: '订单审核通过时间',
  })
  auditTime: Date | null;

  @Column('datetime', {
    name: 'push_time',
    nullable: true,
    comment: '订单推送时间',
  })
  pushTime: Date | null;

  @Column('datetime', {
    name: 'delivery_time',
    nullable: true,
    comment: '订单发货时间',
  })
  deliveryTime: Date | null;

  @Column('bigint', { name: 'customer_id', comment: '客户ID' })
  customerId: string;

  @Column('varchar', {
    name: 'customer_name',
    comment: '客户名称',
    length: 128,
  })
  customerName: string;

  @Column('varchar', {
    name: 'customer_jst_id',
    nullable: true,
    comment: '客户聚水潭ID',
    length: 24,
  })
  customerJstId: string | null;

  @Column('varchar', {
    name: 'region',
    nullable: true,
    comment: '所属区域',
    length: 32,
  })
  region: string | null;

  @Column('bigint', {
    name: 'regional_head_id',
    nullable: true,
    comment: '大区负责人ID',
  })
  regionalHeadId: string | null;

  @Column('varchar', {
    name: 'regional_head_name',
    nullable: true,
    comment: '大区负责人名称',
    length: 128,
  })
  regionalHeadName: string | null;

  @Column('bigint', {
    name: 'provincial_head_id',
    nullable: true,
    comment: '省区负责人ID',
  })
  provincialHeadId: string | null;

  @Column('varchar', {
    name: 'provincial_head_name',
    nullable: true,
    comment: '省区负责人名称',
    length: 128,
  })
  provincialHeadName: string | null;

  @Column('varchar', {
    name: 'contact',
    nullable: true,
    comment: '下单联系人',
    length: 128,
  })
  contact: string | null;

  @Column('varchar', {
    name: 'contact_phone',
    nullable: true,
    comment: '下单联系人电话',
    length: 32,
  })
  contactPhone: string | null;

  @Column('varchar', {
    name: 'receiver_name',
    comment: '收货人姓名',
    length: 128,
  })
  receiverName: string;

  @Column('varchar', {
    name: 'receiver_phone',
    comment: '收货人电话',
    length: 32,
  })
  receiverPhone: string;

  @Column('varchar', {
    name: 'receiver_province',
    nullable: true,
    comment: '收货省份',
    length: 64,
  })
  receiverProvince: string | null;

  @Column('varchar', {
    name: 'receiver_city',
    nullable: true,
    comment: '收货城市',
    length: 64,
  })
  receiverCity: string | null;

  @Column('varchar', {
    name: 'receiver_district',
    nullable: true,
    comment: '收货区/街道',
    length: 64,
  })
  receiverDistrict: string | null;

  @Column('varchar', {
    name: 'receiver_address',
    nullable: true,
    comment: '收货人详细地址',
    length: 200,
  })
  receiverAddress: string | null;

  @Column('decimal', {
    name: 'amount',
    comment: '订单总金额(发货金额），单位：元',
    precision: 12,
    scale: 2,
  })
  amount: string;

  @Column('decimal', {
    name: 'credit_amount',
    comment: '额度计算总额，单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  creditAmount: string;

  @Column('decimal', {
    name: 'replenish_amount',
    comment: '产生的货补金额, 单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  replenishAmount: string;

  @Column('decimal', {
    name: 'auxiliary_sales_amount',
    comment: '产生辅销金额, 单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  auxiliarySalesAmount: string;

  @Column('decimal', {
    name: 'used_replenish_amount',
    comment: '使用货补金额, 单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  usedReplenishAmount: string;

  @Column('decimal', {
    name: 'used_replenish_ratio',
    comment: '使用货补金额比例， 小数形式，如 0.10， 表示 10%',
    precision: 8,
    scale: 4,
    default: () => "'0.0000'",
  })
  usedReplenishRatio: string;

  @Column('decimal', {
    name: 'used_auxiliary_sales_amount',
    comment: '使用辅销金额, 单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  usedAuxiliarySalesAmount: string;

  @Column('decimal', {
    name: 'used_auxiliary_sales_ratio',
    comment: '使用辅助销售金额比例， 同上',
    precision: 8,
    scale: 4,
    default: () => "'0.0000'",
  })
  usedAuxiliarySalesRatio: string;

  @Column('int', {
    name: 'finished_product_box_count',
    comment: '成品商品总箱数',
    default: () => "'0'",
  })
  finishedProductBoxCount: number;

  @Column('int', {
    name: 'replenish_product_box_count',
    comment: '货补商品总箱数',
    default: () => "'0'",
  })
  replenishProductBoxCount: number;

  @Column('int', {
    name: 'auxiliary_sales_product_count',
    comment: '辅销商品总数',
    default: () => "'0'",
  })
  auxiliarySalesProductCount: number;

  @Column('decimal', {
    name: 'paid_amount',
    comment: '已付金额, 单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  paidAmount: string;

  @Column('decimal', {
    name: 'unpaid_amount',
    comment: '未付金额, 单位：元',
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  unpaidAmount: string;

  @Column('varchar', {
    name: 'remark',
    nullable: true,
    comment: '备注信息',
    length: 1000,
  })
  remark: string | null;

  @Column('varchar', {
    name: 'order_timeliness',
    nullable: true,
    comment: '订单时效',
    length: 128,
  })
  orderTimeliness: string | null;

  @Column('varchar', {
    name: 'process_code',
    nullable: true,
    comment: '流程编码',
    length: 128,
  })
  processCode: string | null;

  @Column('varchar', {
    name: 'delivery_requirement',
    nullable: true,
    comment: '发货要求',
    length: 255,
  })
  deliveryRequirement: string | null;

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
