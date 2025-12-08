import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
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

/**
 * 商品请求DTO
 */
export class CommodityRequestDto {
  @ApiProperty({
    description: '业务中台内部商品编码',
    example: 'XSFL_000011',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品编码必须是字符串' })
  commodityCode?: string;

  @ApiProperty({
    description: '商品一级分类ID',
    example: '1735123456789012355',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品一级分类必须是字符串' })
  commodityFirstCategory?: string;

  @ApiProperty({
    description: '商品二级分类ID',
    example: '1735123456789012356',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品二级分类必须是字符串' })
  commoditySecondCategory?: string;

  @ApiProperty({
    description: '商品名称',
    example: '水卫士校服净托台',
  })
  @IsNotEmpty()
  @IsString({ message: '商品名称必须是字符串' })
  commodityName: string;

  @ApiProperty({
    description: '商品简称',
    example: '水卫士校服净托台',
  })
  @IsNotEmpty()
  @IsString({ message: '商品简称必须是字符串' })
  commodityAliaName: string;

  @ApiProperty({
    description: '商品内部编码,与金蝶匹配',
    example: '12121212',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品内部编码必须是字符串' })
  commodityInternalCode?: string;

  @ApiProperty({
    description: '商品条码,与69码匹配',
    example: '12121212',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品条码必须是字符串' })
  commodityBarcode?: string;

  @ApiProperty({
    description: '商品状态',
    example: '1',
    required: false,
  })
  @IsOptional()
  @IsIn(['0', '1', '2'], { message: '商品状态必须是0-下架,1-上架,2-停产' })
  status?: string;

  @ApiProperty({
    description: '是否组合商品',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([0, 1], { message: '是否组合商品必须是1-是，0-否' })
  isBundledProducts?: number;

  @ApiProperty({
    description: '是否为线下销售商品',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([0, 1], { message: '是否为线下销售商品必须是1-是，0-否' })
  isOfflineSales?: number;

  @ApiProperty({
    description: '是否参与额度计算',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([0, 1], { message: '是否参与额度计算必须是1-是，0-否' })
  isQuotaInvolved?: number;

  @ApiProperty({
    description: '是否可做赠品',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([0, 1], { message: '是否可做赠品必须是1-是，0-否' })
  isGiftEligible?: number;

  @ApiProperty({
    description: '是否参与货补',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([0, 1], { message: '是否参与货补必须是1-是，0-否' })
  isSupplySubsidyInvolved?: number;

  @ApiProperty({
    description: '单件规格',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '单件规格必须是字符串' })
  itemSpecPiece?: string;

  @ApiProperty({
    description: '单品规格单位',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '单品规格单位必须是字符串' })
  itemSpecUnit?: string;

  @ApiProperty({
    description: '单品规格信息',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '单品规格信息必须是字符串' })
  itemSpecInfo?: string;

  @ApiProperty({
    description: '单品最小计量单位',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '单品最小计量单位必须是字符串' })
  itemMinSpecUnit?: string;

  @ApiProperty({
    description: '箱包装规格',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '箱包装规格必须是数字' })
  boxSpecPiece?: number;

  @ApiProperty({
    description: '箱规信息',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '箱规信息必须是字符串' })
  boxSpecInfo?: string;

  @ApiProperty({
    description: '商品材质',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品材质必须是字符串' })
  material?: string;

  @ApiProperty({
    description: '单品出厂价（元）',
    example: '4.5',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '单品出厂价必须是字符串' })
  itemExFactoryPrice?: string;

  @ApiProperty({
    description: '单品建议零售价（元）',
    example: '4.5',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '建议零售价必须是字符串' })
  itemSuggestedPrice?: string;

  @ApiProperty({
    description: '单品最低零售价（元）',
    example: '4.5',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '单品最低控价必须是字符串' })
  itemMinRetailPrice?: string;

  @ApiProperty({
    description: '单品最低零售折扣（%）',
    example: '4.5',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '	零售折扣价必须是字符串' })
  itemMinRetailDiscount?: string;

  @ApiProperty({
    description: '单品最低控价零售折扣（%）',
    example: '4.5',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '最低控价折扣必须是字符串' })
  itemMinControlledDiscount?: string;

  @ApiProperty({
    description: '组合商品ID',
    example: '1,2,3',
    required: false,
    type: [CommodityBundledSkuResponseDto],
  })
  @IsOptional()
  compositeCommodity?: CommodityBundledSkuResponseDto[];
}
