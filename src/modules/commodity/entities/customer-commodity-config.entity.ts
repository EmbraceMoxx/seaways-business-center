// 在 commodity-info.entity.ts 文件中添加以下实体类

import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('customer_commodity_config')
export class CustomerCommodityConfigEntity {
  @PrimaryColumn({ type: 'bigint', name: 'id', comment: 'ID' })
  id: string;

  @Column({ type: 'bigint', name: 'customer_id', comment: '客户ID' })
  customerId: string;

  @Column({
    type: 'bigint',
    name: 'commodity_internal_code',
    comment: '商品内部编码',
  })
  commodityInternalCode: string;

  @Column({
    type: 'bigint',
    name: 'use_commodity_id',
    comment: '下单使用产品价格',
  })
  useCommodityId: string;

  @Column({
    type: 'bigint',
    name: 'exclude_commodity_id',
    comment: '同单品需要排除的产品',
  })
  excludeCommodityId: string;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'enabled',
    default: 'YES',
    nullable: true,
    comment: '是否启用，YES-启用，NO-禁用',
  })
  enabled: string;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'deleted',
    default: 'NO',
    nullable: true,
    comment: '是否删除，YES-删除，NO-未删除',
  })
  deleted: string;

  @Column({
    type: 'bigint',
    name: 'creator_id',
    nullable: true,
    comment: '创建人ID',
  })
  creatorId: string;

  @Column({
    type: 'datetime',
    name: 'created_time',
    nullable: true,
    comment: '创建时间',
  })
  createdTime: Date;

  @Column({
    type: 'bigint',
    name: 'reviser_id',
    nullable: true,
    comment: '修改人ID',
  })
  reviserId: string;

  @Column({
    type: 'datetime',
    name: 'revised_time',
    nullable: true,
    comment: '修改时间',
  })
  revisedTime: Date;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'creator_name',
    nullable: true,
    comment: '创建人名字',
  })
  creatorName: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'reviser_name',
    nullable: true,
    comment: '更新人名字',
  })
  reviserName: string;
}
