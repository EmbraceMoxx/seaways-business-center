import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';

@Entity('customer_info')
export class CustomerInfoEntity {
  @PrimaryColumn({
    type: 'bigint',
    comment: '商品ID',
  })
  id: string;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 128,
    comment: '客户名称',
  })
  customerName: string;

  @Column({
    name: 'customer_jst_id',
    type: 'varchar',
    length: 12,
    nullable: true,
    comment: '客户聚水潭ID',
  })
  customerJstId: string;

  @Column({
    name: 'customer_type',
    type: 'int',
    default: -1,
    comment: '类型：1-店铺，2-分销商，-1-待开通',
  })
  customerType: number;

  @Column({
    name: 'region',
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '客户所属区域',
  })
  region: string;

  @Column({
    name: 'province',
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '省份',
  })
  province: string;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '城市',
  })
  city: string;

  @Column({
    name: 'regional_head',
    type: 'varchar',
    length: 12,
    nullable: true,
    comment: '大区负责人',
  })
  regionalHead: string;

  @Column({
    name: 'regional_head_id',
    type: 'bigint',
    nullable: true,
    comment: '大区负责人ID',
  })
  regionalHeadId: string;

  @Column({
    name: 'provincial_head',
    type: 'varchar',
    length: 12,
    nullable: true,
    comment: '省区负责人',
  })
  provincialHead: string;

  @Column({
    name: 'provincial_head_id',
    type: 'bigint',
    nullable: true,
    comment: '省区负责人ID',
  })
  provincialHeadId: string;

  @Column({
    name: 'principal_user_id',
    type: 'bigint',
    nullable: true,
    comment: '客户负责--销售ID',
  })
  principalUserId: string;

  @Column({
    name: 'distributor_type',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '经销商类型，多个使用逗号间隔',
  })
  distributorType: string;

  @Column({
    name: 'is_contract',
    type: 'int',
    default: 0,
    comment: '是否签订合同，1签订0未签订',
  })
  isContract: number;

  @Column({
    name: 'contract_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '合同任务金额，元',
  })
  contractAmount: string;

  @Column({
    name: 'contract_validity_period',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '合同有效期',
  })
  contractValidityPeriod: string;

  @Column({
    name: 'reconciliation_mail',
    type: 'varchar',
    length: 123,
    nullable: true,
    comment: '对账邮箱',
  })
  reconciliationMail: string;

  @Column({
    name: 'co_status',
    type: 'varchar',
    length: 20,
    default: '1',
    comment: '客户合作状态：1-合作0-不合作',
  })
  coStatus: string;

  @Column({
    name: 'is_earnest_money',
    type: 'varchar',
    length: 20,
    default: '1',
    comment: '是否缴纳保证金，1缴纳0未缴纳',
  })
  isEarnestMoney: string;

  @Column({
    name: 'enabled',
    type: 'varchar',
    length: 10,
    default: GlobalStatusEnum.YES,
    comment: '是否启用，YES-启用，NO-禁用',
  })
  enabled: string;

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
