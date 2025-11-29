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
  @ApiOperation({ summary: '需要获取聚水潭的订单编码集合' })
  @Get('order-codes')
  async getSyncOrderCodes(): Promise<SuccessResponseDto<QueryOrderCodesDto>> {
    const result = await this.orderSyncService.getSyncOrderCodes();
    return new SuccessResponseDto(result, '获取成功');
  }

  @ApiOperation({ summary: '聚水潭订单状态同步！' })
  @Post('sync-jst-status')
  async syncJstOrderStatus(@Body() request: SyncOrderStatusDto[]) {
    const result = await this.orderSyncService.syncJstOrderStatus(request);
    return new SuccessResponseDto(result, '状态同步完成！');
  }
}
