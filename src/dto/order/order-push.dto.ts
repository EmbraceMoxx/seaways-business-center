import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OrderPushDto {
  @ApiProperty({
    description: '订单ID',
    example: 'XX20251111123456',
  })
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsString({ message: '订单ID必须是字符串' })
  orderId: string;
}
