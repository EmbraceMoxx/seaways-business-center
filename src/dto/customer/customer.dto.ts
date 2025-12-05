import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNotEmpty } from 'class-validator';
import { PageRequestDto } from '@src/dto/common/common.dto';
import { CreditLimitStatisticsResponseDto } from './customer-credit-limit.dto';

/**
 * 客户列表查询参数DTO
 */
export class QueryCustomerDto extends PageRequestDto {
  @ApiProperty({
    description: '客户名称',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '客户名称必须是字符串' })
  customerName?: string;

  @ApiProperty({
    description: '类型',
    required: false,
  })
  @IsOptional()
  customerType?: number;

  @ApiProperty({
    description: '大区负责人',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '大区负责人必须是字符串' })
  regionalHead?: string;

  @ApiProperty({
    description: '省区负责人',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '省区负责人必须是字符串' })
  provincialHead?: string;

  @ApiProperty({
    description: '客户负责人-销售ID',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '客户负责人必须是字符串' })
  principalUserId?: string;

  @ApiProperty({
    description: '客户所属区域',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '区域必须是字符串' })
  region?: string;
}

/**
 * 客户列表响应DTO
 */
export class CustomerListInfoResponseDto {
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
    description: '客户负责人-销售ID',
    example: '1735123456789012347',
  })
  principalUserId: string;

  @ApiProperty({
    description: '省份',
    example: '广东',
  })
  province: string;

  @ApiProperty({
    description: '城市',
    example: '广州',
  })
  city: string;

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
    description: '客户聚水潭ID',
    example: '16205412',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '聚水潭ID必须是字符串' })
  customerJstId?: string;

  @ApiProperty({
    description: '大区负责人Id',
    example: '123456789012346',
  })
  @IsNotEmpty()
  @IsString({ message: '大区负责人Id必须是字符串' })
  regionalHeadId: string;

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
  contractAmount?: number;

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

  @ApiProperty({
    description: '是否缴纳保证金，1-缴纳,0-未缴纳',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([1, 0], { message: '是否缴纳保证金只能是1或0' })
  isEarnestMoney?: number;

  @ApiProperty({
    description: '类型：1-店铺2-分销商-1待开通聚水潭店铺',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([1, 2, -1], { message: '类型只能是1或2或-1' })
  customerType?: number;
}
