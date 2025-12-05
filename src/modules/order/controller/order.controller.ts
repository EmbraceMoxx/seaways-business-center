import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Logger, Param, Post } from '@nestjs/common';
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
  UpdateOrderRemarks,
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
import { OrderStatusEnum } from '@src/enums/order-status.enum';

@ApiTags('订单管理')
@Controller('order')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private orderCheckService: OrderCheckService,
    private userService: UserService,
    private orderPushService: OrderPushService,
    private logger: Logger,
  ) {}

  @Post('check-amount')
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

  @Post('update-remarks')
  @ApiOperation({ summary: '更新订单备注' })
  async updateRemarks(
    @Body() req: UpdateOrderRemarks,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.orderService.updateRemarks(req, user);
    return new SuccessResponseDto(result, '订单备注更新成功！');
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
  /**
   * 确认订单回款接口
   * 不再从页面调用，用于处理单个订单未释放额度的情况
   *
   * @param orderId - 订单ID，从URL路径参数中获取
   * @param user - 当前登录用户信息，包含用户权限和身份标识
   * @returns 返回成功响应对象，包含操作结果提示信息
   */
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
  @Post('under-review-list')
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
    const result = await this.orderPushService.pushOrderToErp(body.orderId, user);
    // 确认额度累计
    try {
      await this.orderService.confirmPayment(body.orderId,user);
    }catch (error){
      this.logger.log(`额度操作失败不影响主推送流程，订单ID为${body.orderId}，打印日志${error}`);
    }
    return new SuccessResponseDto(
      result,
      '订单推送成功',
    );
  }

  @Post('test')
  async testCheckService(
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ) {
    // 1. 计算比例
    const auxRatio = Number(0.0102) || 0;
    const repRatio = Number(0.0971) || 0;
    const subsidyAmount = Number(3818.6) || 0;

    // 2. 是否免审批
    const customerInfo = new CustomerInfoEntity();
    customerInfo.principalUserId = '633192657597894656';
    customerInfo.regionalHeadId = '633192657597894656';
    if (
      this.orderCheckService.isFreeApproval(
        customerInfo,
        auxRatio,
        repRatio,
        subsidyAmount,
      )
    ) {
      console.log(`免审批：auxRatio=${auxRatio}, repRatio=${repRatio}`);
      return OrderStatusEnum.PENDING_PUSH;
    }
    // 3. 需要审批：按人岗关系决定第一站
    const isCreator = user.userId === customerInfo.principalUserId;
    console.log(
      `需审批：auxRatio=${auxRatio}, repRatio=${repRatio}, ` +
        `isCreator=${isCreator}, provincialHeadId=${customerInfo.provincialHeadId}, ` +
        `regionalHeadId=${customerInfo.regionalHeadId}`,
    );
    // 3.1 省区存在
    if (customerInfo.provincialHeadId) {
      return isCreator
        ? OrderStatusEnum.REGION_REVIEWING //  其他人提交→先到大区
        : OrderStatusEnum.PROVINCE_REVIEWING; //  creator 自己就是省区
    }

    // 3.2 仅大区存在
    if (customerInfo.regionalHeadId) {
      return isCreator
        ? OrderStatusEnum.DIRECTOR_REVIEWING
        : OrderStatusEnum.REGION_REVIEWING;
    }
    // 默认流程： 省区审批
    console.log(OrderStatusEnum.PROVINCE_REVIEWING);
  }
}
