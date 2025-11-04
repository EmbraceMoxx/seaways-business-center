import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsInt } from 'class-validator';

/**
 *商品分类响应信息DTO
 */
export class CategoryResponseDto {
  @ApiProperty({
    description: '分类ID',
    example: '1735123456789012345',
  })
  id: string;

  @ApiProperty({
    description: '父分类ID，根分类为null',
    example: '1735123456789012345',
  })
  parentId: string;

  @ApiProperty({
    description: '分类名称',
    example: '成品商品',
  })
  categoryName: string;

  @ApiProperty({
    description: '分类编码',
    example: 'C01',
  })
  categoryCode: string;

  @ApiProperty({
    description: '分类层级，从1开始',
    example: 1,
  })
  categoryLevel: number;

  @ApiProperty({
    description: '分类ID路由，如：1_2_3',
    example: '1_2_3',
  })
  idRoute: string;

  @ApiProperty({
    description: '排序顺序',
    example: 1,
  })
  sortOrder: number;

  @ApiProperty({
    description: '是否为叶子节点，YES-是，NO-不是',
    example: 'YES',
  })
  isLeaf: string;

  @ApiProperty({
    description: '分类描述',
    example: 'C01',
  })
  description: string;

  @ApiProperty({
    description: '是否启用，YES-启用，NO-禁用',
    example: 'YES',
  })
  enabled: string;

  @ApiProperty({
    description: '是否删除，YES-删除，NO-未删除',
    example: 'YES',
  })
  deleted: string;

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
    description: '修改人ID',
    example: '1735123456789012345',
  })
  reviserId: string;

  @ApiProperty({
    description: '更新人名字',
    example: '张三',
  })
  reviserName: string;

  @ApiProperty({
    description: '修改时间',
    example: '2021-01-01 00:00:00',
  })
  revisedTime: Date;

  @ApiProperty({
    description: '子分类列表',
    type: [CategoryResponseDto],
  })
  children: CategoryResponseDto[];
}

/**
 * 商品分类请求DTO
 */
export class CategoryRequestDto {
  @ApiProperty({
    description: '父级ID',
    example: '1735123456789012345',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '父级ID必须是字符串' })
  parentId?: string;

  @ApiProperty({
    description: '分类名称',
    example: '成品商品',
  })
  @IsString({ message: '分类名称必须是字符串' })
  categoryName: string;

  @ApiProperty({
    description: '分类编码',
    example: 'C01',
  })
  @IsString({ message: '分类编码必须是字符串' })
  categoryCode: string;

  @ApiProperty({
    description: '分类排序',
    example: '1',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: '分类排序必须是数字' })
  sortOrder?: number;

  @ApiProperty({
    description: '分类描述',
    example: 'C01',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '分类描述必须是字符串' })
  description?: string;

  @ApiProperty({ description: '是否启用', example: 'YES' })
  @IsString({ message: '是否启用必须是字符串' })
  @IsIn(['YES', 'NO'], { message: '是否启用必须是YES或NO' })
  enabled: string;
}
