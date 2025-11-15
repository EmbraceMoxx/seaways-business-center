import { ApiProperty } from '@nestjs/swagger';
import { isIn, IsOptional, IsString } from 'class-validator';
import { PageRequestDto } from '@src/dto/common/common.dto';

/**
 * 客户地址管理列表查询参数DTO
 */
export class QueryCustomerAddresstDto extends PageRequestDto {
  @ApiProperty({
    description:
      '地址：省份(province)或城市(city)或区县(district)或详细地址(address)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '地址必须是字符串' })
  searchKeyValue?: string;

  @ApiProperty({
    description: '收货人姓名',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '收货人姓名必须是字符串' })
  consigneeName?: string;

  @ApiProperty({
    description: '联系电话',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '联系电话必须是字符串' })
  phone?: string;
}

/**
 * 客户地址管理信息响应DTO
 */
export class CustomerAddressResponseDto {
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
    description: '省份',
    example: '广东省',
  })
  province: number;

  @ApiProperty({
    description: '城市',
    example: '广州市',
  })
  city: string;

  @ApiProperty({
    description: '区县',
    example: '白云区',
  })
  district: string;

  @ApiProperty({
    description: '详细地址',
    example: '大塘地铁站',
  })
  address: string;

  @ApiProperty({
    description: '收货人姓名',
    example: '李四',
  })
  consigneeName: string;

  @ApiProperty({
    description: '联系电话',
    example: '15088786338',
  })
  phone: string;

  @ApiProperty({
    description: '是否为默认地址，1-默认 0-非默认',
    example: 1,
  })
  isDefault: number;

  @ApiProperty({
    description: '是否启用，YES-启用，NO-未启用',
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
 * 客户地址管理请求DTO响应DTO
 */
export class CustomerAddressRequestDto {
  @ApiProperty({
    description: '客户ID',
    example: '1735123456789012346',
  })
  customerId: string;

  @ApiProperty({
    description: '省份',
    example: '广东省',
    required: false,
  })
  @IsOptional()
  province?: number;

  @ApiProperty({
    description: '城市',
    example: '广州市',
    required: false,
  })
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: '区县',
    example: '白云区',
    required: false,
  })
  @IsOptional()
  district?: string;

  @ApiProperty({
    description: '详细地址',
    example: '大塘地铁站',
  })
  address: string;

  @ApiProperty({
    description: '收货人姓名',
    example: '李四',
  })
  consigneeName: string;

  @ApiProperty({
    description: '联系电话',
    example: '15088786338',
  })
  phone: string;

  @ApiProperty({
    description: '是否为默认地址，1-默认 0-非默认',
    example: 1,
    required: false,
  })
  @IsOptional()
  isDefault?: number;

  @ApiProperty({
    description: '是否启用，YES-启用，NO-未启用',
    example: 'YES',
    required: false,
  })
  @IsOptional()
  enabled?: string;
}
