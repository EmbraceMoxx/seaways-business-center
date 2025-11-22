import { ApiProperty } from '@nestjs/swagger';
import { CreditToMonthResponseDto } from './customer-credit-limit-detail.dto';

/**
 * 客户【月度】额度流水信息响应DTO
 */
export class MonthCreditInfoResponseDto {
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
    description: '客户所属区域',
    example: '华东区',
  })
  region: string;

  @ApiProperty({
    description: '统计所属年份',
    example: 2025,
  })
  bizYear: number;

  @ApiProperty({
    description: '统计所属月份',
    example: 5,
  })
  bizMonth: number;

  @ApiProperty({
    description: '统计年月',
    example: 202505,
  })
  bizYearMonth: number;

  @ApiProperty({
    description: '合同任务金额，元',
    example: 500.0,
  })
  contractMissionAmount: string;

  @ApiProperty({
    description: '发货金额 = 订单金额，元',
    example: 1000.0,
  })
  shippedAmount: string;

  @ApiProperty({
    description: '回款金额，元',
    example: 150.0,
  })
  repaymentAmount: string;

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
 * 新增客户【月度】额度信息参数DTO
 */
export class QueryMonthlyCreditDto extends CreditToMonthResponseDto {
  @ApiProperty({
    description: '统计所属年份',
    example: 2025,
  })
  bizYear: number;

  @ApiProperty({
    description: '统计所属月份',
    example: 5,
  })
  bizMonth: number;

  @ApiProperty({
    description: '统计年月',
    example: 202505,
  })
  bizYearMonth: number;
}
