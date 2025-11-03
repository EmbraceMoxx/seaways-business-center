import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commodity_bundled_sku_info')
export class CommodityBundledSkuInfo {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '业务主键' })
  id: number;

  @Column('bigint', { name: 'commodity_id', comment: '父商品ID' })
  commodityId: string;

  @Column('bigint', { name: 'bundled_commodity_id', comment: '组合商品ID' })
  bundledCommodityId: string;

  @Column('varchar', {
    name: 'bundle_commodity_internal_code',
    nullable: true,
    comment: '组合商品内部编码,与金蝶匹配',
    length: 100,
  })
  bundleCommodityInternalCode: string | null;

  @Column('varchar', {
    name: 'bundle_commodity_barcode',
    nullable: true,
    comment: '组合商品条码,与69码匹配',
    length: 100,
  })
  bundleCommodityBarcode: string | null;

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
