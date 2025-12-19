import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Logger, Param, Post, Res } from '@nestjs/common';
import {
  AddOfflineOrderRequest,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  GetOrderDetailDto,
  OrderDetailResponseDto,
  OrderInfoResponseDto,
  QueryOrderDto,
  SuccessResponseDto,
  UpdateOfflineOrderRequest,
  UpdateOrderRemarks,
} from '@src/dto';
import * as exceljs from 'exceljs';
import { BusinessException } from '@src/dto/common/common.dto';
import { generateSafeFileName } from '@src/utils/exportDataToExcel';
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
    await this.orderService.confirmPayment(orderId, user, true);
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
    const result = await this.orderPushService.pushOrderToErp(
      body.orderId,
      user,
    );
    return new SuccessResponseDto(result, '订单推送成功');
  }

  @Post('test')
  async testCheckService(@CurrentUser() user: JwtUserPayload) {
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

  @ApiOperation({ summary: '客户额度列表导出' })
  @Post('export')
  async exportToExcel(
    @Res() res,
    @Body() query: QueryOrderDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ) {
    try {
      // 1、创建工作簿
      const workbook = new exceljs.Workbook();
      // 2、创建工作表
      const worksheet = workbook.addWorksheet('订单信息');

      // 3、局中配置
      const alignment: Partial<exceljs.Alignment> = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // 4、设置列标题
      worksheet.columns = [
        {
          header: '客户名称',
          key: 'customerName',
          width: 36,
        },
        {
          header: '订单编码',
          key: 'orderCode',
          width: 24,
          style: {
            alignment,
          },
        },
        {
          header: '订单状态',
          key: 'orderStatus',
          width: 15,
          style: {
            alignment,
          },
        },
        { header: '订单总金额', key: 'amount', width: 18 },
        {
          header: '商品名称',
          key: 'commodityName',
          width: 54,
        },
        {
          header: '商品内部编码',
          key: 'internalCode',
          width: 18,
          style: {
            alignment,
          },
        },
        {
          header: '商品条码',
          key: 'commodityBarcode',
          width: 18,
          style: {
            alignment,
          },
        },
        {
          header: '单品规格信息',
          key: 'specInfo',
          width: 40,
          style: {
            alignment: {
              vertical: 'middle',
              horizontal: 'left',
            },
          },
        },
        {
          header: '箱规格',
          key: 'boxSpecInfo',
          width: 15,
        },
        {
          header: '是否计入额度',
          key: 'isQuotaInvolved',
          width: 15,
          style: {
            alignment,
          },
        },
        {
          header: '产品类型',
          key: 'productType',
          width: 15,
          style: {
            alignment,
          },
        },
        {
          header: '出厂价',
          key: 'exFactoryPrice',
          width: 15,
        },
        {
          header: '推单产品数量',
          key: 'quantity',
          width: 14,
          style: {
            alignment: {
              vertical: 'middle',
              horizontal: 'left',
            },
          },
        },
        {
          header: '订单金额',
          key: 'itemAmount',
          width: 15,
        },
        {
          header: '产生货补金额',
          key: 'generatedReplenishAmount',
          width: 15,
        },
        {
          header: '使用货补金额',
          key: 'usedReplenishAmount',
          width: 15,
        },
        {
          header: '产生辅销金额',
          key: 'generatedAuxiliarySalesAmount',
          width: 15,
        },
        {
          header: '使用辅销金额',
          key: 'usedAuxiliarySalesAmount',
          width: 15,
        },
        {
          header: '下单商品备注',
          key: 'itemRemark',
          width: 25,
        },
        {
          header: '下单时间',
          key: 'createdTime',
          width: 27,
          style: {
            numFmt: 'yyyy-mm-dd hh:mm:ss',
            alignment,
          },
        },
      ];
      // 5、获取数据
      const exportList = await this.orderService.exportOrderList(
        query,
        user,
        token,
      );

      // 6、添加数据行
      for (const item of exportList) {
        worksheet.addRow(item, 'n');
      }
      // 7、设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // 8、设置文件名
      const fileName = generateSafeFileName('order_list', 'xlsx');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      // 9、导出数据
      await workbook.xlsx.write(res);
      // 10、结束响应
      res.end();
    } catch (error) {
      throw new BusinessException('订单列表导出失败');
    }
  }
}
