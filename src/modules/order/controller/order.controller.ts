import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  SuccessResponseDto,
  QueryOrderDto,
  OrderInfoResponseDto,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  UpdateOfflineOrderRequest,
  AddOfflineOrderRequest,
  GetOrderDetailDto,
  OrderDetailResponseDto,
  ErrorResponseDto,
} from '@src/dto';
import { OrderService } from '@modules/order/service/order.service';
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
  ): Promise<SuccessResponseDto<string>> {
    try {
      const result = await this.orderService.add(req, user);
      return new SuccessResponseDto(result, '订单新增成功！');
    } catch (error) {
      // 确保这里能捕获到 BusinessException
      return new ErrorResponseDto('订单新增失败！');
    }
  }

  @Post('update')
  @ApiOperation({ summary: '修改订单信息' })
  async update(
    @Body() req: UpdateOfflineOrderRequest,
    @CurrentUser() user: JwtUserPayload,
  ) {
    try {
      const result = await this.orderService.update(req, user);
      return new SuccessResponseDto(result, '订单修改成功！');
    } catch (error) {
      // 确保这里能捕获到 BusinessException
      return new ErrorResponseDto('订单修改失败！');
    }
  }

  @Post('cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancel(
    @Body() req: CancelOrderRequest,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.orderService.cancel(req, user);
    return new SuccessResponseDto('id', '订单已取消！');
  }

  @ApiOperation({ summary: '获取订单列表' })
  @Post('list')
  async getOrderList(
    @Body() body: QueryOrderDto,
  ): Promise<
    SuccessResponseDto<{ items: OrderInfoResponseDto[]; total: number }>
  > {
    const list = await this.orderService.getOrderList(body);
    return new SuccessResponseDto(list, '获取订单列表成功');
  }

  @Post('detail')
  @ApiOperation({ summary: '获取订单详情' })
  async getOrderDetail(
    @Body() body: GetOrderDetailDto,
  ): Promise<SuccessResponseDto<OrderDetailResponseDto>> {
    const orderDetail = await this.orderService.getOrderDetail(body.orderId);
    return new SuccessResponseDto(orderDetail, '获取订单详情成功');
  }

  @ApiOperation({ summary: '获取订单列表' })
  @Post('unReviewlist')
  async getUnReviewOrderList(
    @Body() body: QueryOrderDto,
  ): Promise<
    SuccessResponseDto<{ items: OrderInfoResponseDto[]; total: number }>
  > {
    const list = await this.orderService.getUnReviewOrderList(body);
    return new SuccessResponseDto(list, '获取待审核订单列表成功');
  }
}
