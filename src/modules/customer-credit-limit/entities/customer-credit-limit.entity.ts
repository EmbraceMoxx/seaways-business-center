import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';

@Entity('customer_credit_amount_info')
export class CustomerCreditAmountInfoEntity {
  @PrimaryColumn({
    type: 'bigint',
    comment: '主键id',
  })
  id: string;

  @Column({
    name: 'customer_id',
    type: 'bigint',
    comment: '客户ID',
  })
  customerId: string;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 128,
    comment: '客户名称',
  })
  customerName: string;

  @Column({
    name: 'region',
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '客户所属区域',
  })
  region: string;

  @Column({
    name: 'shipped_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '发货金额 = 订单金额，元',
  })
  shippedAmount: string;

  @Column({
    name: 'repayment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '回款金额，元',
  })
  repaymentAmount: string;

  @Column({
    name: 'auxiliary_sale_goods_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '3%辅销品金额，元',
  })
  auxiliarySaleGoodsAmount: string;

  @Column({
    name: 'replenishing_goods_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '10%货补金额，元',
  })
  replenishingGoodsAmount: string;

  @Column({
    name: 'used_auxiliary_sale_goods_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '已提辅销金额，元',
  })
  usedAuxiliarySaleGoodsAmount: string;

  @Column({
    name: 'remain_auxiliary_sale_goods_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '剩余辅销金额，元',
  })
  remainAuxiliarySaleGoodsAmount: string;

  @Column({
    name: 'used_replenishing_goods_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '已提货补金额，元',
  })
  usedReplenishingGoodsAmount: string;

  @Column({
    name: 'remain_replenishing_goods_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '剩余货补金额，元',
  })
  remainReplenishingGoodsAmount: string;

  @Column({
    name: 'deleted',
    type: 'varchar',
    length: 10,
    default: GlobalStatusEnum.NO,
    comment: '是否删除，YES-删除，NO-未删除',
  })
  deleted: string;

  @Column({
    name: 'creator_id',
    type: 'bigint',
    nullable: true,
    comment: '创建人ID',
  })
  creatorId: string;

  @CreateDateColumn({
    name: 'created_time',
    type: 'datetime',
    nullable: true,
    comment: '创建时间',
  })
  createdTime: Date;

  @Column({
    name: 'reviser_id',
    type: 'bigint',
    nullable: true,
    comment: '修改人ID',
  })
  reviserId: string;

  @UpdateDateColumn({
    name: 'revised_time',
    type: 'datetime',
    nullable: true,
    comment: '修改时间',
  })
  revisedTime: Date;

  @Column({
    name: 'creator_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '创建人名字',
  })
  creatorName: string;

  @Column({
    name: 'reviser_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '更新人名字',
  })
  reviserName: string;
}
