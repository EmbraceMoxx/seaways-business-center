import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
import { generateId } from '@src/utils';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';

@Entity('commodity_category')
export class CommodityCategoryEntity {
  @PrimaryColumn({
    type: 'bigint',
    comment: '分类ID',
  })
  id: string;

  @Column({
    name: 'parent_id',
    type: 'bigint',
    nullable: true,
    comment: '父分类ID，根分类为null',
  })
  parentId: string;

  @Column({
    name: 'category_name',
    type: 'varchar',
    length: 100,
    comment: '分类名称',
  })
  categoryName: string;

  @Column({
    name: 'category_code',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '分类编码',
  })
  categoryCode: string;

  @Column({
    name: 'category_level',
    type: 'int',
    default: 1,
    comment: '分类层级，从1开始',
  })
  categoryLevel: number;

  @Column({
    name: 'id_route',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '分类ID路由，如：1_2_3',
  })
  idRoute: string;

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: '排序顺序',
  })
  sortOrder: number;

  @Column({
    name: 'is_leaf',
    type: 'varchar',
    length: 10,
    default: GlobalStatusEnum.YES,
    comment: '是否为叶子节点，YES-是，NO-不是',
  })
  isLeaf: string;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '分类描述',
  })
  description: string;

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

  @Column({
    name: 'creator_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '创建人名字',
  })
  creatorName: string;

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

  @Column({
    name: 'reviser_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '更新人名字',
  })
  reviserName: string;

  @UpdateDateColumn({
    name: 'revised_time',
    type: 'datetime',
    nullable: true,
    comment: '修改时间',
  })
  revisedTime: Date;

  // 添加 children 属性用于构建树结构
  children?: CommodityCategoryEntity[];
}
