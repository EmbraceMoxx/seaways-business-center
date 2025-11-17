import { Column, Entity, BeforeInsert } from 'typeorm';
import { generateId } from '@src/utils';

@Entity('customer_address')
export class CustomerAddressEntity {
  @Column('bigint', { primary: true, name: 'id', comment: '主键id' })
  id: string;

  @Column('bigint', { name: 'customer_id', comment: '客户ID' })
  customerId: string;

  @Column('varchar', {
    name: 'province',
    nullable: true,
    comment: '省份',
    length: 50,
  })
  province: string | null;

  @Column('varchar', {
    name: 'city',
    nullable: true,
    comment: '城市',
    length: 50,
  })
  city: string | null;

  @Column('varchar', {
    name: 'district',
    nullable: true,
    comment: '区县',
    length: 50,
  })
  district: string | null;

  @Column('varchar', { name: 'address', comment: '详细地址', length: 200 })
  address: string;

  @Column('varchar', {
    name: 'consignee_name',
    comment: '收货人姓名',
    length: 32,
  })
  consigneeName: string;

  @Column('varchar', { name: 'phone', comment: '联系电话', length: 20 })
  phone: string;

  @Column('int', {
    name: 'is_default',
    nullable: true,
    comment: '是否为默认地址，1-默认 0-非默认',
    default: () => "'0'",
  })
  isDefault: number | null;

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

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateId();
    }
  }
}
