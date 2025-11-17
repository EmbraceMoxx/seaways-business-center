import { Injectable } from '@nestjs/common';
import {
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
} from '@src/dto/order/order.common.dto';

@Injectable()
export class OrderService {
  /**
   * 检查订单金额
   * @param req - 检查订单金额请求参数
   * @returns 检查订单金额响应结果的Promise
   */
  public checkOrderAmount(
    req: CheckOrderAmountRequest,
  ): Promise<CheckOrderAmountResponse> {
    return null;
  }
}
