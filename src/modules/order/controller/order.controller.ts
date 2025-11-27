import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  AddOfflineOrderRequest,
  ApprovalRejectRequest,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  ErrorResponseDto,
  GetOrderDetailDto,
  OrderDetailResponseDto,
  OrderInfoResponseDto,
  QueryOrderDto,
  SuccessResponseDto,
  UpdateOfflineOrderRequest,
} from '@src/dto';
import { OrderService } from '@modules/order/service/order.service';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { OrderPushDto } from '@src/dto/order/order-push.dto';
import { OrderPushService } from '../service/order-push.service';
import { CurrentToken } from '@src/decorators/current-token.decorator';
import { UserService } from '@modules/common/user/user.service';
import { OrderCheckService } from '@modules/order/service/order-check.service';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';

@ApiTags('订单管理')
@Controller('order')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private orderCheckService: OrderCheckService,
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
    const result = await this.orderService.add(req, user);
    return new SuccessResponseDto(result, '订单新增成功！');
  }

  @Post('update')
  @ApiOperation({ summary: '修改订单信息' })
  async update(
    @Body() req: UpdateOfflineOrderRequest,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.orderService.update(req, user);
    return new SuccessResponseDto(result, '订单修改成功！');
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
  @Post('confirm-payment/:orderId')
  @ApiOperation({ summary: '确认回款' })
  async confirmPayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.orderService.confirmPayment(orderId, user);
    return new SuccessResponseDto('id', '订单已确认回款！');
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
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<SuccessResponseDto<OrderDetailResponseDto>> {
    const orderDetail = await this.orderService.getOrderDetail(body.orderId);
    orderDetail.operateButtons =
      await this.orderCheckService.getOrderOperateButtons(
        user,
        token,
        body.orderId,
      );
    return new SuccessResponseDto(orderDetail, '获取订单详情成功');
  }

  @ApiOperation({ summary: '获取待审核订单列表' })
  @Post('unReviewList')
  async getUnReviewOrderList(
    @Body() body: QueryOrderDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<
    SuccessResponseDto<{ items: OrderInfoResponseDto[]; total: number }>
  > {
    const list = await this.orderService.getUnReviewOrderList(
      body,
      user,
      token,
    );
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
    const req = new CheckOrderAmountResponse();
    req.replenishRatio = '0.12';
    req.auxiliarySalesRatio = '0.004';
    const customer = new CustomerInfoEntity();
    customer.regionalHeadId = '633192657597894656';
    customer.principalUserId = '633192657597894656';
    user.userId = '633192658931683328';
    // customer.provincialHeadId = '633192658931683328';
    const reject = new ApprovalRejectRequest();
    reject.orderId = '648056041950547968';
    reject.rejectReason = '测试驳回';
    // reject.creatorId = '633192658931683328';
    // reject.operatorName = '张坤坤';
    // await this.orderService.approvalReject(reject);
    // 测试取消订单
    // return await this.orderCheckService.calculateOrderStatus(
    //   req,
    //   user,
    //   customer,
    // );
  }
}
