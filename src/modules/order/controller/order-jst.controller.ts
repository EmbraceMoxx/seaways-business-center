import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { SuccessResponseDto } from '@src/dto';
import { OrderJstService } from '@modules/order/service/order-jst.service';
import { Public } from '@src/modules/auth/public.decorator';

@ApiTags('聚水潭状态同步管理')
@Controller('order/jst')
export class OrderJstController {
  constructor(private readonly orderJstServic: OrderJstService) {}

  // Todo: 加白名单
  @ApiOperation({ summary: '同步聚水潭订单状态' })
  @Get('sync/order-status')
  @Public()
  async syncOrderStatus() {
    const result = await this.orderJstServic.executeOrderStatusSync();
    return new SuccessResponseDto(result, '同步完成');
  }
}
