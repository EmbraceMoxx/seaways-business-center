import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
import { OrderPushDto } from '@src/dto/order/order-push.dto';
import { OrderPushService } from '../service/order-push.service';
import { CurrentToken } from '@src/decorators/current-token.decorator';
import { UserService } from '@modules/common/user/user.service';

@ApiTags('订单管理')
@Controller('order')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private userService: UserService,
    private orderPushService: OrderPushService,
  ) {}

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
      console.log(error);
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
      console.log(error);
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
    try {
      await this.orderService.cancel(req, user);
      return new SuccessResponseDto('id', '订单已取消！');
    } catch (error) {
      return new ErrorResponseDto('订单确认支付失败！');
    }
  }
  @Post('confirm-payment/:orderId')
  @ApiOperation({ summary: '确认回款' })
  async confirmPayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    try {
      await this.orderService.confirmPayment(orderId, user);
      return new SuccessResponseDto('id', '订单已确认支付！');
    } catch (error) {
      return new ErrorResponseDto('订单确认支付失败！');
    }
  }

  @ApiOperation({ summary: '获取订单列表' })
  @Post('list')
  async getOrderList(
    @Body() body: QueryOrderDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<
    SuccessResponseDto<{ items: OrderInfoResponseDto[]; total: number }>
  > {
    const list = await this.orderService.getOrderList(body, user, token);
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

  @ApiOperation({ summary: '推送订单到ERP系统' })
  @Post('push')
  async pushOrderToErp(
    @Body() body: OrderPushDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto<string>> {
    return new SuccessResponseDto(
      await this.orderPushService.pushOrderToErp(body.orderId, user),
      '订单推送成功',
    );
  }

  @Post('test')
  async testCheckService(
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ) {
    console.log('user:', user);
    // 测试取消订单

    const result = await this.userService.getRangeOfOrderQueryUser(
      token,
      user.userId,
    );
    console.log('result:', JSON.stringify(result));
  }
}
