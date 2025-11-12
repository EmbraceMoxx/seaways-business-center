import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageRequestDto } from '@src/dto/common/common.dto';

/**
 * 客户额度流水明细列表查询参数DTO
 */
export class QueryCreditLimiDetailtDto extends PageRequestDto {
  @ApiProperty({
    description: '流水编号',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '流水编号必须是字符串' })
  flowCode?: string;

  @ApiProperty({
    description: '客户名称',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '客户名称必须是字符串' })
  customerName?: string;

  @ApiProperty({
    description: '聚水潭线上订单号',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '线上订单号必须是字符串' })
  onlineOrderId?: string;

  @ApiProperty({
    description: '开始时间',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '开始时间是字符串' })
  startTime?: string;

  @ApiProperty({
    description: '结束时间',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '结束时间是字符串' })
  endTime?: string;
}

/**
 * 客户额度流水明细信息响应DTO
 */
export class CreditLimitDetailResponseDto {
  @ApiProperty({
    description: '主键id',
    example: '1735123456789012345',
  })
  id: string;

  @ApiProperty({
    description: '客户ID',
    example: '1735123456789012346',
  })
  customerId: string;

  @ApiProperty({
    description: '客户名称',
    example: '某某公司',
  })
  customerName: string;

  @ApiProperty({
    description: '流水状态',
    example: -1,
  })
  status: number;

  @ApiProperty({
    description: '流水编号',
    example: 'XX20251111+时间戳',
  })
  flowCode: string;

  @ApiProperty({
    description: '内部订单ID',
    example: '1211123456789012347',
  })
  orderId: string;

  @ApiProperty({
    description: '聚水潭线上订单号',
    example: 'SXYXJ20251101001',
  })
  onlineOrderId: string;

  @ApiProperty({
    description: '发货金额 = 订单金额，元',
    example: 1000.0,
  })
  shippedAmount: string;

  @ApiProperty({
    description: '3%辅销品金额，元',
    example: 150.0,
  })
  auxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '10%货补金额，元',
    example: 150.0,
  })
  replenishingGoodsAmount: string;

  @ApiProperty({
    description: '已提辅销金额，元',
    example: 150.0,
  })
  usedAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '剩余辅销金额，元',
    example: 150.0,
  })
  remainAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '已提货补金额，元',
    example: 500.0,
  })
  usedReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '剩余货补金额，元',
    example: 150.0,
  })
  remainReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '回款凭证，预留用于记录回款截图',
    example: 150.0,
  })
  payableVoucher: string;

  @ApiProperty({
    description: '是否删除，YES-删除，NO-未删除',
    example: 'NO',
  })
  deleted: string;

  @ApiProperty({
    description: '创建人ID',
    example: '1735123456789012347',
  })
  creatorId: string;

  @ApiProperty({
    description: '创建时间',
    example: '2021-01-01T00:00:00Z',
  })
  createdTime: Date;

  @ApiProperty({
    description: '修改人ID',
    example: '1735123456789012348',
  })
  reviserId: string;

  @ApiProperty({
    description: '修改时间',
    example: '2021-01-01T00:00:00Z',
  })
  revisedTime: Date;

  @ApiProperty({
    description: '创建人名字',
    example: '张三',
  })
  creatorName: string;

  @ApiProperty({
    description: '更新人名字',
    example: '李四',
  })
  reviserName: string;
}

/**
 * 客户额度流水请求DTO响应DTO
 */
export class CreditLimitDetailRequestDto {
  @ApiProperty({
    description: '客户ID',
    example: '1735123456789012346',
  })
  customerId: string;

  @ApiProperty({
    description: '客户名称',
    example: '某某公司',
  })
  customerName: string;

  @ApiProperty({
    description: '流水状态',
    example: -1,
  })
  status: number;

  @ApiProperty({
    description: '流水编号',
    example: 'XX20251111+时间戳',
  })
  flowCode: string;

  @ApiProperty({
    description: '内部订单ID',
    example: '1211123456789012347',
  })
  orderId: string;

  @ApiProperty({
    description: '聚水潭线上订单号',
    example: 'SXYXJ20251101001',
  })
  onlineOrderId: string;

  @ApiProperty({
    description: '发货金额 = 订单金额，元',
    example: 1000.0,
  })
  shippedAmount: string;

  @ApiProperty({
    description: '3%辅销品金额，元',
    example: 150.0,
  })
  auxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '10%货补金额，元',
    example: 150.0,
  })
  replenishingGoodsAmount: string;

  @ApiProperty({
    description: '已提辅销金额，元',
    example: 150.0,
  })
  usedAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '剩余辅销金额，元',
    example: 150.0,
  })
  remainAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '已提货补金额，元',
    example: 500.0,
  })
  usedReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '剩余货补金额，元',
    example: 150.0,
  })
  remainReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '回款凭证，预留用于记录回款截图',
    example: 150.0,
  })
  payableVoucher: string;
}
