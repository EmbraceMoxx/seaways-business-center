import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '../entities/order.main.entity';
import { OrderItemEntity } from '../entities/order.item.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { JstHttpService } from '@src/modules/erp/jushuitan/jst-http.service';
import {
  ERP_JST_API,
  ERP_JST_CODE,
} from '@src/modules/erp/jushuitan/jst-http.constant';
import { OrderEventService } from './order-event/order-event.service';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import { BusinessException } from '@src/dto';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import * as dayjs from 'dayjs';
import {
  JST_ORDER_STATUS,
  OrderEventStatusEnum,
} from './order-event/order-event.constant';
import { OrderItemTypeEnum } from '@src/enums/order-item-type.enum';
import { JstOrderPostDataItem } from '../interface/order-push.interface';
import { OrderEventEntity } from '../entities/order.event.entity';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import {
  EventExecuteResult,
  OrderEventMainInfo,
} from '../interface/order-event-task.interface';
import { OrderLogHelper } from '../helper/order.log.helper';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { BusinessLogService } from '@src/modules/common/business-log/business-log.service';
import { CustomerCreditLimitDetailEntity } from '@src/modules/customer/entities/customer-credit-limit-detail.entity';

@Injectable()
export class OrderPushService {
  private readonly _logger = new Logger(OrderPushService.name);
  constructor(
    private readonly _jstHttpService: JstHttpService,
    private readonly _orderEventService: OrderEventService,

    @InjectRepository(OrderMainEntity)
    private readonly _orderRepository: Repository<OrderMainEntity>,

    @InjectRepository(OrderItemEntity)
    private readonly _orderItemRepository: Repository<OrderItemEntity>,

    private readonly _dataSource: DataSource,
    private readonly _businessLogService: BusinessLogService,
  ) {}

  async _uploadOrderToJst(postData: any): Promise<any> {
    const thisContext = `${this.constructor.name}._uploadOrderToJst`;
    const api = ERP_JST_API.UPLOAD_ORDER;
    const maxRetries = 5;
    const retryDelay = (attempt: number) =>
      Math.min(1000 * Math.pow(2, attempt - 1), 8000) + Math.random() * 500;

    const RETRYABLE_NET_ERROR = [
      'EAI_AGAIN',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNABORTED',
    ];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this._jstHttpService.post(api, postData);
        const { code } = res.data;

        // 业务错误重试
        if (
          code === ERP_JST_CODE.TOO_FREQUENT ||
          code === ERP_JST_CODE.EXCEED_LIMIT
        ) {
          if (attempt < maxRetries) {
            const delay = retryDelay(attempt);
            this._logger.warn(
              `接口请求过于频繁或超限（code=${code}），第 ${attempt}/${maxRetries} 次尝试，等待 ${delay}ms 重试。`,
              thisContext,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));

            continue;
          } else {
            throw new Error(
              `接口频率限制，已达最大重试次数：${maxRetries}, code=${code}`,
            );
          }
        }
        return res.data;
      } catch (err) {
        // 网络错误重试
        const code = err?.code || err?.cause?.code;
        const isRetryable = RETRYABLE_NET_ERROR.includes(code);
        if (isRetryable && attempt < maxRetries) {
          const delay = retryDelay(attempt);
          this._logger.warn(
            `Network error on attempt ${attempt}/${maxRetries}, net code=${code}, ` +
              `message=${err?.message}. Retrying after ${delay} ms...`,
            thisContext,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        this._logger.error(
          `Failed to upload order to JST after ${attempt} attempts. ` +
            `Error code=${code}, message=${err?.message}`,
          thisContext,
        );

        throw new Error(`未能上传订单到 JST`);
      }
    }

    throw new Error('超过最大重试次数，未能上传订单');
  }

  _assembleJstPostData(
    orderMain: OrderMainEntity,
    orderItems: OrderItemEntity[],
  ): JstOrderPostDataItem[] {
    const postData: JstOrderPostDataItem = {} as JstOrderPostDataItem;
    postData['shop_id'] = Number(orderMain.customerJstId); // 客户聚水潭ID作为店铺ID
    postData['so_id'] = orderMain.orderCode; // 订单编号, 全局唯一，作为聚水潭线上订单号
    postData['order_date'] = dayjs().format('YYYY-MM-DD HH:mm:ss'); // 推送订单日期
    postData['shop_status'] = JST_ORDER_STATUS.WAIT_SELLER_SEND_GOODS; // 订单状态，待发货
    postData['pay_amount'] = Number(orderMain.amount); // 订单总金额
    postData['freight'] = 0; // 运费
    postData['remark'] = orderMain.remark || ''; // 订单备注
    postData['buyer_message'] = '线下下单推单'; // 买家留言
    postData['shop_buyer_id'] = orderMain.receiverName || ''; // 买家ID, 实际填写收货人姓名

    postData['receiver_state'] = orderMain.receiverProvince || ''; // 收货人省份
    postData['receiver_city'] = orderMain.receiverCity || ''; // 收货人城市
    postData['receiver_district'] = orderMain.receiverDistrict || ''; // 收货人区县
    postData['receiver_address'] = orderMain.receiverAddress || ''; // 收货人详细地址
    postData['receiver_name'] = orderMain.receiverName || ''; // 收货人姓名
    postData['receiver_phone'] = orderMain.receiverPhone || ''; // 收货人电话

    postData['pay'] = {
      outer_pay_id: '-', // 外部支付编号，若无可填'-'
      pay_date: dayjs().format('YYYY-MM-DD HH:mm:ss'), // 支付时间
      payment: '-', // 支付方式，若无可填'-'
      seller_account: '-', // 收款账号，若无可填'-'
      buyer_account: '-', // 付款账号，若无可填'-'
      amount: Number(orderMain.amount), // 支付金额
    };

    postData['items'] = orderItems.map((item) => ({
      sku_id: item.internalCode || '', // 商品SKU编码
      shop_sku_id: item.internalCode || '', // 店铺商品SKU编码
      amount: Number(item.amount), // 商品总价
      price: Number(item.exFactoryPrice), // 商品单价
      base_price: Number(item.exFactoryPrice), // 原价
      qty: item.qty, // 商品数量
      name: item.name, // 商品名称
      outer_oi_id: item.id, // 外部订单明细项ID
      is_gift: [
        String(OrderItemTypeEnum.REPLENISH_PRODUCT),
        String(OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT),
      ].includes(item.type), // 是否为赠品
    }));

    return [postData];
  }

  async assembleOrderData(orderId: string): Promise<any> {
    const orderMain = await this._orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) {
      throw new BusinessException('订单不存在');
    }

    const orderItems = await this._orderItemRepository.find({
      where: { orderId: orderId, deleted: GlobalStatusEnum.NO },
    });

    // 组装订单数据结构，具体字段根据聚水潭API要求进行映射
    const postData = this._assembleJstPostData(orderMain, orderItems);
    this._logger.debug(
      `Assembled JST post data for orderId=${orderId}: ${JSON.stringify(
        postData,
      )}`,
    );
    return postData;
  }

  async updateOrderPushEvent(
    event: OrderEventEntity,
    oriInnerOrderCode: string,
    user: JwtUserPayload,
    context: string,
  ): Promise<void> {
    const thisContext = `${this.constructor.name}.updateSuccessfulPush`;

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 更新订单状态为已推送
      await this._updatePushedOrder(
        event.businessId,
        oriInnerOrderCode,
        user,
        context,
        queryRunner.manager,
      );

      // 更新订单额度流水记录
      await this._updateCreditLimitFlowAfterPush(
        event.businessId,
        oriInnerOrderCode,
        user,
        queryRunner.manager,
      );

      // 更新事件状态为已完成
      await this._orderEventService.updateEventStatus({
        eventId: event.id,
        status: OrderEventStatusEnum.COMPLETED,
        message: '订单推送成功',
        businessStatus: String(OrderStatusEnum.PUSHED),
        businessMessage: '订单已成功推送到聚水潭',
        lastOperateProgram: context,
        manager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this._logger.error(
        `Error updating after order push: innerCode=${oriInnerOrderCode}, ` +
          `orderId=${event.businessId}: ${err?.message}`,
        err?.stack,
        thisContext,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async uploadOrder(orderId: string, postData: any): Promise<string | null> {
    const thisContext = `${this.constructor.name}.uploadOrder`;

    let innerOrderCode: string | null = null;
    let response: any;
    try {
      // 推送订单到聚水潭
      response = await this._uploadOrderToJst(postData);
    } catch (err) {
      this._logger.error(
        `Error pushing orderId=${orderId} to JST: ${err?.message}`,
        err?.stack,
        thisContext,
      );
      throw new BusinessException('未能推送订单到聚水潭');
    }

    if (response.code !== ERP_JST_CODE.SUCCESS) {
      this._logger.warn(
        `Push order error: orderId=${orderId}, code=${response.code}, message=${response?.msg}`,
      );
      throw new BusinessException('推送订单返回错误');
    }

    const orderData = response?.data?.datas;
    if (!Array.isArray(orderData) || orderData.length === 0) {
      throw new BusinessException('响应数据格式不正确或为空');
    }

    innerOrderCode = orderData[0]?.o_id || null;
    if (!innerOrderCode) {
      throw new BusinessException('响应数据缺少内部订单编号');
    }

    return innerOrderCode;
  }

  /**
   * 检查推送订单的条件并锁定订单
   * @param orderId
   * @param user
   */
  async checkOrderPushable(
    orderId: string,
    user: JwtUserPayload,
  ): Promise<void> {
    const thisContext = `${this.constructor.name}.checkOrderPushable`;

    await this._dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrderMainEntity);
      const orderMain = await repo.findOne({
        where: { id: orderId, deleted: GlobalStatusEnum.NO },
        lock: { mode: 'pessimistic_write' },
      });
      if (!orderMain) {
        this._logger.warn(`Order not found, id=${orderId}`, thisContext);
        throw new BusinessException(`未找到订单`);
      }

      // 如果已推送则直接返回
      if (orderMain.orderStatus === String(OrderStatusEnum.PUSHED)) {
        this._logger.log(`Order already pushed, id=${orderId}`, thisContext);
        return;
      }

      // 检查订单状态，待推送才允许推送
      if (orderMain.orderStatus !== String(OrderStatusEnum.PENDING_PUSH)) {
        this._logger.warn(
          `Order status invalid, id=${orderId}, status=${orderMain.orderStatus}`,
          thisContext,
        );
        throw new BusinessException(`订单状态不允许推送`);
      }

      // 更新订单状态为推送中
      await repo.update(
        { id: orderId, deleted: GlobalStatusEnum.NO },
        {
          orderStatus: String(OrderStatusEnum.PUSHING),
          reviserId: user.userId,
          reviserName: user.nickName,
          revisedTime: dayjs().toDate(),
          lastOperateProgram: thisContext,
        },
      );
    });
  }

  /**
   * 更新已推送订单信息
   */
  async _updatePushedOrder(
    orderId: string,
    innerOrderCode: string,
    user: JwtUserPayload,
    context: string,
    manager?: EntityManager,
  ): Promise<void> {
    const now = dayjs().toDate();

    const repo = manager
      ? manager.getRepository(OrderMainEntity)
      : this._orderRepository;

    const order = await repo.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });

    if (!order) {
      this._logger.warn(
        `Order not found when updating pushed order, orderId=${orderId}`,
        context,
      );
      throw new BusinessException(`未找到订单`);
    }

    await repo.update(
      { id: order.id },
      {
        orderStatus: String(OrderStatusEnum.PUSHED),
        onlineOrderCode: order.orderCode, // 推送后线上订单号即为订单编号
        oriInnerOrderCode: innerOrderCode, // 聚水潭内部订单编号
        pushTime: now,
        reviserId: user.userId,
        reviserName: user.nickName,
        revisedTime: now,
        lastOperateProgram: context,
      },
    );
  }

  /**
   * 更新推送后订单额度流水信息
   */
  async _updateCreditLimitFlowAfterPush(
    orderId: string,
    innerOrderCode: string,
    user: JwtUserPayload,
    manager?: EntityManager,
  ): Promise<void> {
    const now = dayjs().toDate();

    const repo = manager
      ? manager.getRepository(CustomerCreditLimitDetailEntity)
      : this._dataSource.getRepository(CustomerCreditLimitDetailEntity);

    // 更新订单额度流水的线上订单编号
    await repo.update(
      { orderId: orderId, deleted: GlobalStatusEnum.NO },
      {
        onlineOrderId: innerOrderCode, // 聚水潭线上订单编号
        reviserId: user.userId,
        reviserName: user.nickName,
        revisedTime: now,
      },
    );
  }

  /**
   * 推送订单到ERP系统
   * @param orderId
   * @param user
   * @returns ERP系统返回的订单编号
   */
  async pushOrderToErp(
    orderId: string,
    user: JwtUserPayload,
  ): Promise<string | null> {
    const thisContext = `${this.constructor.name}.pushOrderToErp`;
    this._logger.log(`Pushing order id=${orderId}`, thisContext);

    // 检查推送条件
    await this.checkOrderPushable(orderId, user);

    // 记录操作日志
    const logInput = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.PUSH_ORDER_PAYMENT,
      thisContext,
      orderId,
    );
    logInput.params = { orderId: orderId };
    await this._businessLogService.writeLog(logInput);

    // 检查是否已推送成功
    const exist = await this._orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });
    if (exist.orderStatus === String(OrderStatusEnum.PUSHED)) {
      this._logger.log(`Order already pushed, skip uploading.`, thisContext);
      return exist.oriInnerOrderCode;
    }

    // 组装订单数据并推送
    let erpOrderCode: string | null = null;
    try {
      const orderData = await this.assembleOrderData(orderId);
      erpOrderCode = await this.uploadOrder(orderId, orderData);
    } catch (err) {
      this._logger.error(
        `Push order ${orderId} error: ${err?.message}`,
        err?.stack,
        thisContext,
      );

      // 实时推送异常，登记事件由事件处理重试
      try {
        await this._orderEventService.createOrderPushEvent(orderId);
      } catch (eventErr) {
        this._logger.error(
          `Failed to create order push event for orderId=${orderId}: ${eventErr.message}`,
          eventErr?.stack,
          thisContext,
        );
        if (eventErr instanceof BusinessException) {
          throw eventErr;
        } else {
          throw new BusinessException('推送订单异常，且未能登记订单事件');
        }
      }

      if (err instanceof BusinessException) {
        throw err;
      }
      throw new BusinessException('推送订单到ERP系统异常');
    }

    // 推送成功, 更新订单状态和额度流水记录
    try {
      await this._dataSource.transaction(async (manager) => {
        await this._updatePushedOrder(
          orderId,
          erpOrderCode,
          user,
          thisContext,
          manager,
        );
        await this._updateCreditLimitFlowAfterPush(
          orderId,
          erpOrderCode,
          user,
          manager,
        );
      });
    } catch (err) {
      this._logger.error(
        `Failed to update info after push for orderId=${orderId}: ${err?.message}`,
        err?.stack,
        thisContext,
      );
      throw new BusinessException('推送订单成功，但更新订单状态出错');
    }

    this._logger.log(`Pushed order ${orderId} to ERP.`, thisContext);
    return erpOrderCode;
  }

  /**
   * 处理订单推送事件
   * @param eventInfo
   * @param user
   */
  async handleOrderPushEvent(
    eventInfo: OrderEventMainInfo,
    user: JwtUserPayload,
  ): Promise<EventExecuteResult> {
    const thisContext = `${this.constructor.name}.handleOrderPushEvent`;
    const orderId = eventInfo.businessId;

    this._logger.log(`Pushing order id=${orderId}`, thisContext);

    const order = await this._orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });

    if (!order) {
      this._logger.warn(`Order not found id=${orderId}`, thisContext);
      return {
        success: false,
        message: '订单不存在',
        businessMessage: '订单不存在',
      };
    }

    const afterPushStatuses = [
      String(OrderStatusEnum.PUSHED),
      String(OrderStatusEnum.DELIVERED),
    ];
    if (afterPushStatuses.includes(order.orderStatus)) {
      this._logger.warn(`Order already pushed, id=${orderId}`, thisContext);
      return {
        success: true,
        message: '订单已推送，无需重复推送',
        businessStatus: String(order.orderStatus),
        businessMessage: '订单状态为已推送或已发货',
      };
    }

    // 订单状态必须为推送中才能重试推送
    if (order.orderStatus !== String(OrderStatusEnum.PUSHING)) {
      this._logger.warn(
        `Order status error, id=${orderId}, status=${order.orderStatus}`,
        thisContext,
      );
      return {
        success: false,
        message: '订单状态异常，无法推送',
        businessStatus: String(order.orderStatus),
        businessMessage: '订单状态异常，无法推送',
      };
    }

    try {
      const event = await this._orderEventService.findEventById(eventInfo.id);
      const postData = await this.assembleOrderData(orderId);
      const response = await this._uploadOrderToJst(postData);
      if (response.code !== ERP_JST_CODE.SUCCESS) {
        this._logger.warn(
          `Push to jst error: id=${orderId}, code=${response.code}, message=${response?.msg}`,
        );
        return {
          success: false,
          message: `推送订单出错: ${response?.msg || ''}`,
        };
      }

      const orderData = response?.data?.datas;
      if (!Array.isArray(orderData) || orderData.length === 0) {
        return {
          success: false,
          message: 'ERP系统返回数据格式不正确或为空',
        };
      }

      const innerOrderCode = orderData[0]?.o_id || null;

      await this.updateOrderPushEvent(event, innerOrderCode, user, thisContext);

      this._logger.log(
        `Push id=${orderId} to ERP, innerOrderCode=${innerOrderCode}.`,
        thisContext,
      );

      return {
        success: true,
        message: '订单推送成功',
        businessStatus: String(OrderStatusEnum.PUSHED),
        businessMessage: '订单已成功推送到聚水潭',
        data: { innerOrderCode },
      };
    } catch (err) {
      this._logger.error(
        `Error pushing id=${orderId}: ${err?.message}`,
        err?.stack,
        thisContext,
      );
      return {
        success: false,
        message: `推送订单异常: ${err?.message}`,
        businessMessage: `推送订单异常: ${err?.message}`,
      };
    }
  }
}
