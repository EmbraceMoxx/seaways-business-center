import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class QueryOrderCodesDto {
  @ApiProperty({
    description: '同步订单时间范围开始时间',
  })
  startTime: Date;
  @ApiProperty({
    description: '同步订单时间范围结束时间',
  })
  endTime: Date;
  @ApiProperty({
    description: '线上订单编码集合',
  })
  orderCodes: string[] = [];
}
export class SyncOrderStatusDto {
  @ApiProperty({
    description: '订单编码',
  })
  @IsNotEmpty()
  orderCode: string;

  @ApiProperty({
    description: '订单操作 1-确认发货2-取消',
  })
  @IsNotEmpty()
  @IsNumber()
  operate: number;
  @ApiProperty({
    description: '操作人姓名',
    required: false,
  })
  @IsOptional()
  operator: string;
}
