import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commodity_category')
export class CommodityCategoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '分类ID' })
  id: number;

  @Column('bigint', {
    name: 'parent_id',
    nullable: true,
    comment: '父分类ID，根分类为null',
  })
  parentId: string | null;

  @Column('varchar', {
    name: 'category_name',
    comment: '分类名称',
    length: 100,
  })
  categoryName: string;

  @Column('varchar', {
    name: 'category_code',
    nullable: true,
    comment: '分类编码',
    length: 50,
  })
  categoryCode: string | null;

  @Column('int', {
    name: 'category_level',
    comment: '分类层级，从1开始',
    default: () => "'1'",
  })
  categoryLevel: number;

  @Column('varchar', {
    name: 'id_route',
    nullable: true,
    comment: '分类ID路由，如：1_2_3',
    length: 500,
  })
  idRoute: string | null;

  @Column('int', {
    name: 'sort_order',
    nullable: true,
    comment: '排序顺序',
    default: () => "'0'",
  })
  sortOrder: number | null;

  @Column('varchar', {
    name: 'is_leaf',
    nullable: true,
    comment: '是否为叶子节点，YES-是，NO-不是',
    length: 10,
    default: () => "'YES'",
  })
  isLeaf: string | null;

  @Column('varchar', {
    name: 'description',
    nullable: true,
    comment: '分类描述',
    length: 500,
  })
  description: string | null;

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
}
