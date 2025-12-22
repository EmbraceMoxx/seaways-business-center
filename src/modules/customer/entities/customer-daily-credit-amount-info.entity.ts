import { Column, Entity, Index, BeforeInsert } from 'typeorm';
import { generateId } from '@src/utils';

@Index('idx_biz_year_month_day', ['bizYearMonthDay'], {})
@Index('idx_customer_id', ['customerId'], {})
@Index('idx_region', ['region'], {})
@Entity('customer_daily_credit_amount_info', {
  schema: 'seaways_base_business_center',
})
export class CustomerDailyCreditAmountInfoEntity {
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

  @Column('varchar', {
    name: 'region',
    nullable: true,
    comment: '客户所属区域',
    length: 32,
  })
  region: string | null;

  @Column('int', { name: 'biz_year_month_day', comment: '统计年月日' })
  bizYearMonthDay: number;

  @Column('int', { name: 'biz_year', comment: '统计所属年份' })
  bizYear: number;

  @Column('int', { name: 'biz_month', comment: '统计所属月份' })
  bizMonth: number;

  @Column('int', { name: 'biz_day', comment: '统计所属日期' })
  bizDay: number;

  @Column('decimal', {
    name: 'contract_mission_amount',
    nullable: true,
    comment: '合同任务金额，元',
    precision: 12,
    scale: 3,
  })
  contractMissionAmount: string | null;

  @Column('decimal', {
    name: 'shipped_amount',
    nullable: true,
    comment: '发货金额 = 订单金额，元',
    precision: 12,
    scale: 3,
  })
  shippedAmount: string | null;

  @Column('decimal', {
    name: 'repayment_amount',
    nullable: true,
    comment: '回款金额，元',
    precision: 12,
    scale: 3,
  })
  repaymentAmount: string | null;

  @Column('decimal', {
    name: 'auxiliary_sale_goods_amount',
    nullable: true,
    comment: '3%辅销品金额，元',
    precision: 12,
    scale: 3,
  })
  auxiliarySaleGoodsAmount: string | null;

  @Column('decimal', {
    name: 'replenishing_goods_amount',
    nullable: true,
    comment: '10%货补金额，元',
    precision: 12,
    scale: 3,
  })
  replenishingGoodsAmount: string | null;

  @Column('decimal', {
    name: 'used_auxiliary_sale_goods_amount',
    nullable: true,
    comment: '已提辅销金额，元',
    precision: 12,
    scale: 3,
  })
  usedAuxiliarySaleGoodsAmount: string | null;

  @Column('decimal', {
    name: 'remain_auxiliary_sale_goods_amount',
    nullable: true,
    comment: '剩余辅销金额，元',
    precision: 12,
    scale: 3,
  })
  remainAuxiliarySaleGoodsAmount: string | null;

  @Column('decimal', {
    name: 'used_replenishing_goods_amount',
    nullable: true,
    comment: '已提货补金额，元',
    precision: 12,
    scale: 3,
  })
  usedReplenishingGoodsAmount: string | null;

  @Column('decimal', {
    name: 'remain_replenishing_goods_amount',
    nullable: true,
    comment: '剩余货补金额，元',
    precision: 12,
    scale: 3,
  })
  remainReplenishingGoodsAmount: string | null;

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
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateId();
    }
  }
}
