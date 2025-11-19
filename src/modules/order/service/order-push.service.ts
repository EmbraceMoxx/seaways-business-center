import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '../entities/order.main.entity';
import { OrderItemEntity } from '../entities/order.item.entity';
import { Repository } from 'typeorm';
import { JstHttpService } from '@src/modules/erp/jushuitan/jst-http.service';
import {
  ERP_JST_API,
  ERP_JST_CODE,
} from '@src/modules/erp/jushuitan/jst-http.constant';
import { OrderEventService } from './order-event.service';
import { JwtUserPayload } from '@src/modules/auth/jwt.strategy';

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
              `message=${err.message}. Retrying after ${delay} ms...`,
            thisContext,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        this._logger.error(
          `Failed to upload order to JST after ${attempt} attempts. ` +
            `Error code=${code}, message=${err.message}`,
          thisContext,
        );

        throw new Error(`未能上传订单到 JST`);
      }
    }

    throw new Error('超过最大重试次数，未能上传订单');
  }

  async _assembleOrderData(orderId: string): Promise<any> {
    // todo: implement order data assembly logic
    return {};
  }

  async _uploadOrderAndUpdate(
    orderId: string,
    postData: any,
    user: JwtUserPayload,
  ): Promise<string | null> {
    // todo: implement order upload and update logic
    const response = await this._uploadOrderToJst([postData]);

    return null;
  }

  async pushOrderToErp(
    orderId: string,
    user: JwtUserPayload,
  ): Promise<string | null> {
    const thisContext = `${this.constructor.name}.pushOrderToErp`;

    // 创建推送订单事件，保存到事件表中，状态为未处理
    await this._orderEventService.createOrderPushEvent(orderId, user);
    let innerOrderCode: string | null = null;
    try {
      const orderData = await this._assembleOrderData(orderId);
      innerOrderCode = await this._uploadOrderAndUpdate(
        orderId,
        orderData,
        user,
      );

      this._logger.log(
        `Successfully pushed order ${orderId} to ERP.`,
        thisContext,
      );

      // todo: handle response appropriately
      return innerOrderCode;
    } catch (err) {
      // todo: handle error appropriately
      return null;
    }
  }
}
