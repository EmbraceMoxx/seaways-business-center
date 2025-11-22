import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '../entities/order.main.entity';
import { OrderItemEntity } from '../entities/order.item.entity';
import { DataSource, Repository } from 'typeorm';
import { JstHttpService } from '@src/modules/erp/jushuitan/jst-http.service';
import {
  ERP_JST_API,
  ERP_JST_CODE,
} from '@src/modules/erp/jushuitan/jst-http.constant';
import { OrderEventService } from './order-event.service';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';
import { BusinessException } from '@src/dto';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import * as dayjs from 'dayjs';
import { JST_ORDER_STATUS, OrderEventStatusEnum } from './order-event.constant';
import { OrderItemTypeEnum } from '@src/enums/order-item-type.enum';
import { JstOrderPostDataItem } from '../interface/order-push.interface';
import { OrderEventEntity } from '../entities/order.event.entity';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { OrderEventMainInfo } from '../interface/order-event-task.interface';

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

  async updateSuccessfulPush(
    event: OrderEventEntity,
    oriInnerOrderCode: string,
    user: JwtUserPayload,
    context: string,
  ): Promise<void> {
    const thisContext = `${this.constructor.name}.updateSuccessfulPush`;
    const now = dayjs().toDate();

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 更新订单:状态为已推送, 更新线上订单号，内部订单编号等字段
      const orderRepo = queryRunner.manager.getRepository(OrderMainEntity);
      const order = await orderRepo.findOne({
        where: { id: event.businessId, deleted: GlobalStatusEnum.NO },
      });

      if (!order) {
        this._logger.warn(
          `Order not found when updating successful push, orderId=${event.businessId}`,
          thisContext,
        );
        throw new BusinessException(`未找到订单`);
      }

      await orderRepo.update(
        { id: order.id },
        {
          orderStatus: String(OrderStatusEnum.PUSHED),
          onlineOrderCode: order.orderCode, // 推送后线上订单号即为订单编号
          oriInnerOrderCode: oriInnerOrderCode, // 聚水潭内部订单编号
          pushTime: now,
          reviserId: user.userId,
          reviserName: user.nickName,
          revisedTime: now,
          lastOperateProgram: context,
        },
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

  async uploadOrderAndUpdate(
    event: OrderEventEntity,
    postData: any,
    user: JwtUserPayload,
  ): Promise<string | null> {
    const thisContext = `${this.constructor.name}.uploadOrderAndUpdate`;
    const orderId = event.businessId;

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
      if (
        response.code !== ERP_JST_CODE.TOO_FREQUENT &&
        response.code !== ERP_JST_CODE.EXCEED_LIMIT
      ) {
        // 非可重试错误，更新事件状态为错误(不会重试)，并抛出业务异常
        await this._orderEventService.updateEventStatus({
          eventId: event.id,
          status: OrderEventStatusEnum.ERROR,
          message: '推送订单出错',
          businessMessage: `${response.code}: ${response?.msg || ''}`,
          lastOperateProgram: thisContext,
        });

        throw new BusinessException(`推送订单返回错误信息`);
      }

      throw new BusinessException('推送订单出错，系统将重试');
    }

    const orderData = response?.data?.datas;
    if (!Array.isArray(orderData) || orderData.length === 0) {
      throw new BusinessException('推送订单响应数据格式不正确或为空');
    }

    innerOrderCode = orderData[0]?.o_id || null;
    if (!innerOrderCode) {
      throw new BusinessException('推送订单响应缺少内部订单编号');
    }

    // 开启事务更新订单和事件状态
    try {
      await this.updateSuccessfulPush(event, innerOrderCode, user, thisContext);
    } catch (err) {
      this._logger.error(
        `Error updating order and event after successful push for orderId=${orderId}: ${err?.message}`,
        err?.stack,
        thisContext,
      );
      throw new BusinessException('订单已推送但更新状态出错');
    }

    return innerOrderCode;
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

    // 创建订单推送事件, 更新订单状态为推送中
    const event = await this._orderEventService.createOrderPushEvent(
      orderId,
      user,
    );

    let erpOrderCode: string | null = null;
    try {
      const orderData = await this.assembleOrderData(orderId);
      erpOrderCode = await this.uploadOrderAndUpdate(event, orderData, user);
      this._logger.log(`Pushed order ${orderId} to ERP.`, thisContext);
      return erpOrderCode;
    } catch (err) {
      this._logger.error(
        `Failed to push order ${orderId} to ERP: ${err?.message}`,
        err?.stack,
        thisContext,
      );
      if (err instanceof BusinessException) {
        throw err;
      }
      throw new BusinessException('订单已登记，但推送ERP出错');
    }
  }

  /**
   * 处理订单推送事件, 用于订单事件任务
   * @param eventInfo
   * @param user
   * @returns
   */
  async handleOrderPushEvent(
    eventInfo: OrderEventMainInfo,
    user: JwtUserPayload,
  ): Promise<void> {
    const thisContext = `${this.constructor.name}.handleOrderPushEvent`;
    const orderId = eventInfo.businessId;
    this._logger.log(`Pushing order id=${orderId}`, thisContext);

    const order = await this._orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!order) {
      this._logger.warn(`Order not found id=${orderId}`, thisContext);
      await this._orderEventService.updateEventStatus({
        eventId: eventInfo.id,
        status: OrderEventStatusEnum.ERROR,
        message: '订单不存在，无法推送',
        businessMessage: '订单不存在',
        lastOperateProgram: thisContext,
      });
      throw new BusinessException('订单不存在，无法推送');
    }

    const afterPushStatuses = [
      String(OrderStatusEnum.PUSHED),
      String(OrderStatusEnum.DELIVERED),
    ];
    if (afterPushStatuses.includes(order.orderStatus)) {
      // 订单已推送或已完成，无需重复推送
      this._logger.warn(`Order already pushed, id=${orderId}`, thisContext);
      await this._orderEventService.updateEventStatus({
        eventId: eventInfo.id,
        status: OrderEventStatusEnum.COMPLETED,
        message: '订单已推送，无需重复推送',
        businessStatus: String(order.orderStatus), // 处理完成后的业务状态
        businessMessage: '订单状态为已推送或已发货',
        lastOperateProgram: thisContext,
      });

      return;
    }

    if (order.orderStatus !== String(OrderStatusEnum.PUSHING)) {
      this._logger.warn(
        `Order status error, id=${orderId}, status=${order.orderStatus}`,
        thisContext,
      );
      await this._orderEventService.updateEventStatus({
        eventId: eventInfo.id,
        status: OrderEventStatusEnum.ERROR,
        message: `订单状态异常，无法推送`,
        businessStatus: String(order.orderStatus),
        businessMessage: '订单状态异常，无法推送',
        lastOperateProgram: thisContext,
      });
      throw new BusinessException('订单状态异常，无法推送');
    }

    try {
      const event = await this._orderEventService.findEventById(eventInfo.id);
      const postData = await this.assembleOrderData(orderId);
      const response = await this._uploadOrderToJst(postData);
      if (response.code !== ERP_JST_CODE.SUCCESS) {
        this._logger.warn(
          `Push to jst error: id=${orderId}, code=${response.code}, message=${response?.msg}`,
        );
        throw new BusinessException('推送订单返回错误信息: ' + response?.msg);
      }

      const orderData = response?.data?.datas;
      if (!Array.isArray(orderData) || orderData.length === 0) {
        throw new BusinessException('推送订单响应数据格式不正确或为空');
      }

      const innerOrderCode = orderData[0]?.o_id || null;
      if (!innerOrderCode) {
        throw new BusinessException('推送订单响应缺少内部订单编号');
      }

      await this.updateSuccessfulPush(event, innerOrderCode, user, thisContext);

      this._logger.log(
        `Push id=${orderId} to ERP, innerOrderCode=${innerOrderCode}.`,
        thisContext,
      );
    } catch (err) {
      this._logger.error(
        `Error pushing id=${orderId}: ${err?.message}`,
        err?.stack,
        thisContext,
      );

      await this._orderEventService.updateEventStatus({
        eventId: eventInfo.id,
        status: OrderEventStatusEnum.ERROR,
        message: '订单推送事件出错',
        businessMessage: err.message || '未知错误',
        lastOperateProgram: thisContext,
      });

      throw err;
    }
  }
}
