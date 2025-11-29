import { Injectable } from '@nestjs/common';
import { CustomerCreditLimitDetailService } from '@modules/customer/services/customer-credit-limit-detail.service';
import { EntityManager } from 'typeorm';
import { OrderCheckService } from '@modules/order/service/order-check.service';

export interface IOperateSideEffect {
  /** 返回 Promise，抛错即回滚 */
  handle(orderCode: string, em: EntityManager): Promise<void>;
}
@Injectable()
export class OrderSyncCancelService implements IOperateSideEffect {
  constructor(
    private readonly creditLimitDetailService: CustomerCreditLimitDetailService,
    private readonly orderCheckService: OrderCheckService,
  ) {}

  async handle(orderCode: string, manager: EntityManager): Promise<void> {
    const orderResult = await this.orderCheckService.checkOrderExistByOrderCode(
      orderCode,
    );
    const user = {
      businessSystemId: '',
      exp: 0,
      iat: 0,
      ipAddress: '',
      username: '',
      userId: '1',
      nickName: '超级管理员',
    };
    // 释放额度，要衡量一下要不要新写，逻辑比较特殊
    await this.creditLimitDetailService.closeCustomerOrderCredit(
      orderResult.id,
      user,
      true,
      manager,
    );
  }
}
