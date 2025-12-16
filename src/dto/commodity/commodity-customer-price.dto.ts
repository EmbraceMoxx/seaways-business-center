import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * 商品价格客户映射信息响应DTO
 */
export class CommodityCustomerPriceResponseDto {
  @ApiProperty({
    description: 'ID',
    example: '1159695931180142592',
  })
  id: string;

  @ApiProperty({
    description: '商品ID',
    example: '某某公司',
  })
  commodityId: string;

  @ApiProperty({
    description: '商品名称',
    example: '19110201226',
  })
  commodityName: string;

  @ApiProperty({
    description: '商品内部编码,与金蝶匹配',
    example: '19110201226',
  })
  commodityInternalCode: string;

  @ApiProperty({
    description: '客户ID',
    example: '1157893118434168833',
  })
  customerId: string;

  @ApiProperty({
    description: '客户名称',
    example: '张三',
  })
  customerName: string;

  @ApiProperty({
    description: '单品出厂价（元）',
    example: '4.5',
  })
  itemExFactoryPrice: number;

  @ApiProperty({
    description: '是否参与额度计算',
    example: 1,
  })
  isQuotaInvolved: number;

  @ApiProperty({
    description: '是否可做赠品',
    example: 1,
  })
  isGiftEligible: number;

  @ApiProperty({
    description: '是否参与货补',
    example: 1,
  })
  isSupplySubsidyInvolved: number;

  @ApiProperty({
    description: '是否启用，YES-启用，NO-禁用',
    example: 'YES',
  })
  enabled: string;

  @ApiProperty({
    description: '是否删除，YES-删除，NO-未删除',
    example: 'NO',
  })
  deleted: string;

  @ApiProperty({
    description: '创建人ID',
    example: '1735123456789012348',
  })
  creatorId: string;

  @ApiProperty({
    description: '创建时间',
    example: '2021-01-01T00:00:00Z',
  })
  createdTime: Date;

  @ApiProperty({
    description: '修改人ID',
    example: '1735123456789012349',
  })
  reviserId: string;

  @ApiProperty({
    description: '修改时间',
    example: '2021-01-01T00:00:00Z',
  })
  revisedTime: Date;

  @ApiProperty({
    description: '创建人名字',
    example: '王五',
  })
  creatorName: string;

  @ApiProperty({
    description: '更新人名字',
    example: '赵六',
  })
  reviserName: string;
}

/**
 * 商品价格客户映射请求DTO
 */
export class CommodityCustomerPriceRequestDto {
  @ApiProperty({
    description: '商品内部编码,与金蝶匹配',
    example: '19110201226',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '商品内部编码不能为空' })
  commodityInternalCode?: string;

  @ApiProperty({
    description: '商品ID',
    example: '某某公司',
  })
  @IsNotEmpty()
  commodityId: string;

  @ApiProperty({
    description: '商品名称',
    example: '19110201226',
  })
  @IsNotEmpty()
  @IsString({ message: '商品名称不能为空' })
  commodityName: string;

  @ApiProperty({
    description: '客户ID',
    example: '1157893118434168833',
  })
  @IsNotEmpty()
  @IsString({ message: '客户ID不能为空' })
  customerId: string;

  @ApiProperty({
    description: '单品出厂价（元）',
    example: '4.5',
  })
  @IsNotEmpty()
  @IsNumber({}, { message: '出厂价必须是数字' })
  @Min(1, { message: '出厂价要大于0' })
  itemExFactoryPrice: number;

  @ApiProperty({
    description: '是否参与额度计算,1-是，0-否',
    example: 1,
  })
  @IsNotEmpty()
  @IsIn([0, 1], { message: '是否参与额度计算只能为0或1' })
  isQuotaInvolved: number;

  @ApiProperty({
    description: '是否可做赠品,1-是，0-否',
    example: 1,
  })
  @IsNotEmpty()
  @IsIn([0, 1], { message: '是否可做赠品只能为0或1' })
  isGiftEligible: number;

  @ApiProperty({
    description: '是否参与货补',
    example: 1,
  })
  @IsNotEmpty()
  @IsIn([0, 1], { message: '是否参与货补只能为0或1' })
  isSupplySubsidyInvolved: number;

  @ApiProperty({
    description: '是否启用，YES-启用，NO-未启用',
    example: 'YES',
    required: false,
  })
  @IsOptional()
  enabled?: string;
}
