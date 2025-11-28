import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { SuccessResponseDto } from '@src/dto';
import {
  QueryOrderCodesDto,
  SyncOrderStatusDto,
} from '@src/dto/order/order.sync.dto';
import { OrderSyncService } from '@modules/order/service/order-sync.service';

@ApiTags('订单同步管理')
@Controller('order/sync')
export class OrderSyncController {
  constructor(private readonly orderSyncService: OrderSyncService) {}
  @ApiOperation({ summary: '聚水潭确认发货！' })
  @Get('order-codes')
  async getSyncOrderCodes(): Promise<SuccessResponseDto<QueryOrderCodesDto>> {
    const result = await this.orderSyncService.getSyncOrderCodes();
    return new SuccessResponseDto(result, '同步完成！');
  }

  @ApiOperation({ summary: '聚水潭取消订单！' })
  @Post('sync-jst-status')
  async syncJstOrderStatus(@Body() request: SyncOrderStatusDto[]) {
    const result = await this.orderSyncService.syncJstOrderStatus(request);
    return new SuccessResponseDto(result, '取消完成！');
  }
}
