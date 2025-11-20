import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { PageRequestDto } from '../../dto/common/common.dto';

/**
 * 商品查询列表参数DTO
 */
export class QueryCommodityDto extends PageRequestDto {
  @ApiProperty({
    description: '商品条码',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品条码必须是字符串' })
  commodityBarcode?: string;

  @ApiProperty({
    description: '商品内部编码',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品内部编码必须是字符串' })
  commodityInternalCode?: string;

  @ApiProperty({
    description: '商品名称',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品名称必须是字符串' })
  commodityName?: string;

  @ApiProperty({
    description: '商品简称',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品简称必须是字符串' })
  commodityAliaName?: string;

  @ApiProperty({
    description: '分类',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '分类必须是字符串' })
  categoryId?: string;

  @ApiProperty({
    description: '商品状态',
    required: false,
  })
  @IsOptional()
  @IsIn(['1', '0', '2'], { message: '商品状态必须是1-上架，0-下架，2-停产' })
  status?: string;

  @ApiProperty({
    description: '是否参与额度计算',
    required: false,
  })
  @IsOptional()
  @IsIn([1, 0], { message: '是否参与额度计算必须是1-是，0-否' })
  isQuotaInvolved?: number;

  @ApiProperty({
    description: '是否参与货补',
    required: false,
  })
  @IsOptional()
  @IsIn([1, 0], { message: '是否参与货补必须是1-是，0-否' })
  isSupplySubsidyInvolved?: number;

  @ApiProperty({
    description: '是否可做赠品',
    required: false,
  })
  @IsOptional()
  @IsIn([1, 0], { message: '是否可做赠品必须是1-是，0-否' })
  isGiftEligible?: number;

  @ApiProperty({
    description: '是否启用',
    required: false,
  })
  @IsOptional()
  @IsIn(['YES', 'NO'], { message: '是否启用必须是YES-启用，NO-禁用' })
  enabled?: string;

  @ApiProperty({
    description: '商品分类',
    required: false,
  })
  @IsOptional()
  @IsIn(['1', '2', '3'], { message: '是否启用必须是1-成品、2-辅销、3-货补' })
  commodityClassify?: string;
}

/**
 *商品响应信息DTO
 */
export class CommodityResponseDto {
  @ApiProperty({
    description: '商品ID',
    example: '1143705629588279296',
  })
  id: string;

  @ApiProperty({
    description: '商品编码',
    example: 'CP_000001',
  })
  commodityCode: string;

  @ApiProperty({
    description: '商品名称',
    example: '水卫士洗碗机专用洗涤粉剂1Kg/瓶',
  })
  commodityName: string;

  @ApiProperty({
    description: '商品简称',
    example: '水卫土特惠装强效洁厕净',
  })
  commodityAliaName: string;

  @ApiProperty({
    description: '单件规格',
    example: '1Kg',
  })
  itemSpecPiece: string;

  @ApiProperty({
    description: '商品内部编码',
    example: '19110200728',
  })
  commodityInternalCode: string;

  @ApiProperty({
    description: '商品条码',
    example: '6973688401213',
  })
  commodityBarcode: string;

  @ApiProperty({
    description: '商品一级分类ID',
    example: '1735123456789012345',
  })
  commodityFirstCategory: string;

  @ApiProperty({
    description: '商品一级分类名称',
    example: '分类',
  })
  commodityFirstCategoryName: string;

  @ApiProperty({
    description: '商品二级分类ID',
    example: '1735123456789012345',
  })
  commoditySecondCategory: string;

  @ApiProperty({
    description: '商品二级分类名称',
    example: '分类',
  })
  commoditySecondCategoryName: string;

  @ApiProperty({
    description: '箱规格信息',
    example: '15瓶/箱',
  })
  boxSpecInfo: string;

  @ApiProperty({
    description: '出厂价',
    example: '13.97',
  })
  itemExFactoryPrice: string;

  @ApiProperty({
    description: '是否参与额度计算',
    example: 1,
  })
  isQuotaInvolved: number;

  @ApiProperty({
    description: '是否参与货补',
    example: 1,
  })
  isSupplySubsidyInvolved: number;

  @ApiProperty({
    description: '是否可做赠品',
    example: 1,
  })
  isGiftEligible: number;

  @ApiProperty({
    description: '商品状态',
    example: '1',
  })
  status: string;

  @ApiProperty({
    description: '是否启用',
    example: 'YES',
  })
  enabled: string;

  @ApiProperty({
    description: '创建人ID',
    example: '1735123456789012345',
  })
  creatorId: string;

  @ApiProperty({
    description: '创建人名字',
    example: '张三',
  })
  creatorName: string;

  @ApiProperty({
    description: '创建时间',
    example: '2021-01-01 00:00:00',
  })
  createdTime: Date;

  @ApiProperty({
    description: '组合商品',
    required: false,
  })
  @IsOptional()
  compositeCommodity?: CommodityBundledSkuResponseDto[];
}

/**
 * 组合商品响应信息DTO
 */
export class CommodityBundledSkuResponseDto {
  @ApiProperty({
    description: '主键',
    example: '1',
  })
  id: string;

  @ApiProperty({
    description: '商品名称',
    example: '水卫士洗碗机专用洗涤粉剂1Kg/瓶',
  })
  commodityName: string;

  @ApiProperty({
    description: '商品内部编码',
  })
  commodityInternalCode: string;

  @ApiProperty({
    description: '商品条码',
    example: '6973688401213',
  })
  commodityBarcode: string;

  @ApiProperty({
    description: '箱规信息',
    example: '260x240x50mm/个',
  })
  itemSpecInfo: string;

  @ApiProperty({
    description: '组合商品ID',
    example: '1143705629588279297',
  })
  bundledCommodityId: string;
}
