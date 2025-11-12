import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNotEmpty } from 'class-validator';
import { PageRequestDto } from '@src/dto/common/common.dto';

/**
 * 客户额度列表查询参数DTO
 */
export class QueryCreditLimitDto extends PageRequestDto {
  @ApiProperty({
    description: '客户名称',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '客户名称必须是字符串' })
  customerName?: string;

  @ApiProperty({
    description: '客户所属区域',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '区域必须是字符串' })
  region?: string;
}

/**
 * 客户累积额度信息响应DTO
 */
export class CreditLimitResponseDto {
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
    description: '发货金额 = 订单金额，元',
    example: 10000.0,
  })
  shippedAmount: string;

  @ApiProperty({
    description: '回款金额，元',
    example: 8000.0,
  })
  repaymentAmount: string;

  @ApiProperty({
    description: '3%辅销品金额，元',
    example: 300.0,
  })
  auxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '10%货补金额，元',
    example: 1000.0,
  })
  replenishingGoodsAmount: string;

  @ApiProperty({
    description: '已提辅销金额，元',
    example: 150.0,
  })
  usedAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '冻结产生辅销金额，元',
    example: 150.0,
  })
  frozenSaleGoodsAmount: string;

  @ApiProperty({
    description: '冻结使用辅销品金额，元',
    example: 150.0,
  })
  frozenUsedSaleGoodsAmount: string;

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
    description: '冻结产生货补金额，元',
    example: 150.0,
  })
  frozenReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '冻结使用货补金额，元',
    example: 150.0,
  })
  frozenUsedReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '剩余货补金额，元',
    example: 500.0,
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
 * 客户额度统计累计信息响应DTO
 */
export class CreditLimitStatisticsResponseDto {
  @ApiProperty({
    description: '发货金额，元',
    example: 10000.0,
  })
  shippedAmount: string;

  @ApiProperty({
    description: '回款金额，元',
    example: 8000.0,
  })
  repaymentAmount: string;

  @ApiProperty({
    description: '3%辅销品金额，元',
  })
  auxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '10%货补金额，元',
  })
  replenishingGoodsAmount: string;

  @ApiProperty({
    description: '已提辅销金额，元',
  })
  usedAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '剩余辅销金额，元',
  })
  remainAuxiliarySaleGoodsAmount: string;

  @ApiProperty({
    description: '已提货补金额，元',
  })
  usedReplenishingGoodsAmount: string;

  @ApiProperty({
    description: '剩余货补金额，元',
  })
  remainReplenishingGoodsAmount: string;
}

/**
 * 客户额度列表响应DTO
 */
export class CreditLimitListResponseDto {
  @ApiProperty({
    description: '客户额度列表',
    type: [CreditLimitResponseDto],
  })
  items: CreditLimitResponseDto[];

  @ApiProperty({
    description: '客户额度列表总数',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: '客户额度统计',
    type: CreditLimitStatisticsResponseDto,
  })
  statisticsInfo: CreditLimitStatisticsResponseDto;
}

/**
 * 客户详情响应DTO
 */
export class CustomerInfoResponseDto {
  @ApiProperty({
    description: '客户ID',
    example: '1735123456789012345',
  })
  id: string;

  @ApiProperty({
    description: '客户名称',
    example: '某某公司',
  })
  customerName: string;

  @ApiProperty({
    description: '客户聚水潭ID',
    example: 'CUST001',
  })
  customerJstId: string;

  @ApiProperty({
    description: '客户类型：1-店铺 2-分销商 -1待开通',
    example: 1,
  })
  customerType: number;

  @ApiProperty({
    description: '客户所属区域',
    example: '华东区',
  })
  region: string;

  @ApiProperty({
    description: '省份',
    example: '江苏省',
  })
  province: string;

  @ApiProperty({
    description: '城市',
    example: '南京市',
  })
  city: string;

  @ApiProperty({
    description: '大区负责人',
    example: '张三',
  })
  regionalHead: string;

  @ApiProperty({
    description: '大区负责人ID',
    example: '1735123456789012346',
  })
  regionalHeadId: string;

  @ApiProperty({
    description: '省区负责人',
    example: '李四',
  })
  provincialHead: string;

  @ApiProperty({
    description: '省区负责人ID',
    example: '1735123456789012347',
  })
  provincialHeadId: string;

  @ApiProperty({
    description: '经销商类型，多个使用逗号间隔',
    example: '一级经销商,二级经销商',
  })
  distributorType: string;

  @ApiProperty({
    description: '是否签订合同，1签订 0未签订',
    example: 1,
  })
  isContract: number;

  @ApiProperty({
    description: '合同任务金额，元',
    example: 100000.0,
  })
  contractAmount: string;

  @ApiProperty({
    description: '合同有效期',
    example: '2023-01-01至2023-12-31',
  })
  contractValidityPeriod: string;

  @ApiProperty({
    description: '对账邮箱',
    example: 'finance@company.com',
  })
  reconciliationMail: string;

  @ApiProperty({
    description: '客户合作状态：1-合作 0-不合作',
    example: '1',
  })
  coStatus: string;

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
 * 客户详情响应DTO-额度信息
 */
export class CustomerInfoCreditResponseDto {
  @ApiProperty({
    description: '月度额度信息',
    type: CreditLimitStatisticsResponseDto,
    required: false,
  })
  monthlyCredit?: CreditLimitStatisticsResponseDto;

  @ApiProperty({
    description: '年度额度信息',
    type: CreditLimitStatisticsResponseDto,
    required: false,
  })
  annualCredit?: CreditLimitStatisticsResponseDto;

  @ApiProperty({
    description: '累计额度信息',
    type: CreditLimitStatisticsResponseDto,
    required: false,
  })
  cumulativeCredit?: CreditLimitStatisticsResponseDto;
}

/**
 * 客户信息更新请求DTO
 */
export class CustomerInfoUpdateDto {
  @ApiProperty({
    description: '大区负责人',
    example: '张三',
  })
  @IsNotEmpty()
  @IsString({ message: '大区负责人必须是字符串' })
  regionalHead: string;

  @ApiProperty({
    description: '大区负责人Id',
    example: '123456789012346',
  })
  @IsNotEmpty()
  @IsString({ message: '大区负责人Id必须是字符串' })
  regionalHeadId: string;

  @ApiProperty({
    description: '省区负责人',
    example: '李四',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '省区负责人必须是字符串' })
  provincialHead?: string;

  @ApiProperty({
    description: '省区负责人Id',
    example: '12221',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '省区负责人Id必须是字符串' })
  provincialHeadId?: string;

  @ApiProperty({
    description: '经销商类型，多个使用逗号间隔',
    example: '一级经销商,二级经销商',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '经销商类型必须是字符串' })
  distributorType?: string;

  @ApiProperty({
    description: '合同有效期',
    example: '2023-01-01至2023-12-31',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '合同有效期必须是字符串' })
  contractValidityPeriod?: string;

  @ApiProperty({
    description: '合同任务金额，元',
    example: 100000.0,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '合同任务金额必须是字符串' })
  contractAmount?: string;

  @ApiProperty({
    description: '对账邮箱',
    example: 'finance@company.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '对账邮箱必须是字符串' })
  reconciliationMail?: string;

  @ApiProperty({
    description: '客户合作状态：1-合作 0-不合作',
    example: '1',
  })
  @IsNotEmpty()
  @IsIn(['1', '0'], { message: '客户合作状态只能是1或0' })
  coStatus: string;
}
