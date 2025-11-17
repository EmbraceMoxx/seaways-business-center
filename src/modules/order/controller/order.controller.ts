import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post } from '@nestjs/common';
import { OrderService } from '@modules/order/service/order.service';
import {
  AddOfflineOrderRequest,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  UpdateOfflineOrderRequest,
} from '@src/dto/order/order.common.dto';
import { SuccessResponseDto } from '@src/dto';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';

@ApiTags('订单管理')
@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('checkAmount')
  @ApiOperation({ summary: '校验订单金额信息' })
  async checkOrderAmount(
    @Body() req: CheckOrderAmountRequest,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto<CheckOrderAmountResponse>> {
    const response = await this.orderService.checkOrderAmount(req);
    return new SuccessResponseDto<CheckOrderAmountResponse>(
      response,
      '获取成功',
    );
  }

  @Post('add')
  @ApiOperation({ summary: '新增线下订单' })
  async add(
    @Body() req: AddOfflineOrderRequest,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return new SuccessResponseDto('id', '订单新增成功！');
  }

  @Post('update/:id')
  @ApiOperation({ summary: '修改订单信息' })
  async update(
    @Body() req: UpdateOfflineOrderRequest,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return new SuccessResponseDto('id', '订单新增成功！');
  }
  @Post('cancel/:id')
  @ApiOperation({ summary: '取消订单' })
  async cancel(
    @Body() req: CancelOrderRequest,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return new SuccessResponseDto('id', '订单已取消！');
  }
}
