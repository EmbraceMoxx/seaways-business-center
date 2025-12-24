// 定义校验策略接口
import { CheckOrderAmountResponse } from '@src/dto';
import { Inject, Injectable } from '@nestjs/common';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { Repository } from 'typeorm';
import {
  AUX_THRESHOLD_TOKEN,
  REP_REGION_THRESHOLD_TOKEN,
  REP_THRESHOLD_TOKEN,
} from '@modules/order/constant';

export interface ValidationStrategy {
  validate(
    response: CheckOrderAmountResponse,
    customerInfo: CustomerInfoEntity,
  ): Promise<string[]>;
}
/** 把 0.14  → "14.00" ；安全、无误差 */
export const toPercent = (ratioStr: string | undefined): string => {
  const n = Math.round(parseFloat(ratioStr || '0') * 100 * 100) / 100; // 先放大 10000 再缩回去
  return n.toFixed(2); // 此时 n 已是两位小数级别的 Number
};
// 货补比例校验策略
@Injectable()
export class ReplenishRatioValidationStrategy implements ValidationStrategy {
  // 把阈值通过构造器注入，保持策略类无静态依赖
  constructor(
    @Inject(REP_THRESHOLD_TOKEN)
    private readonly replenishThreshold: number, // 默认 0，业务层传入
    @Inject(REP_REGION_THRESHOLD_TOKEN)
    private readonly replenishRegionThreshold: number, // 默认 10%，业务层传入
  ) {}
  async validate(
    response: CheckOrderAmountResponse,
    customerInfo: CustomerInfoEntity,
  ): Promise<string[]> {
    const messages: string[] = [];

    const actual = parseFloat(response.replenishRatio || '0');
    // 省区负责人不存在则return
    if (response.isFreeApproval) {
      return messages;
    }
    if (actual > this.replenishThreshold && customerInfo.provincialHeadId) {
      messages.push(
        `货补比例 ${toPercent(response.replenishRatio)}% 超过上限，需审批`,
      );
    }
    if (
      actual > this.replenishRegionThreshold &&
      !customerInfo.provincialHeadId
    ) {
      messages.push(
        `货补比例 ${toPercent(response.replenishRatio)}% 超过上限 ${(
          this.replenishRegionThreshold * 100
        ).toFixed(0)}%，需审批`,
      );
    }

    return messages;
  }
}

// 辅销比例校验策略
@Injectable()
export class AuxiliarySalesRatioValidationStrategy
  implements ValidationStrategy
{
  constructor(
    @Inject(AUX_THRESHOLD_TOKEN)
    private readonly auxiliaryThreshold: number, // 默认 3%，业务层传入
  ) {}
  async validate(response: CheckOrderAmountResponse): Promise<string[]> {
    const messages: string[] = [];
    const actual = parseFloat(response.auxiliarySalesRatio || '0');
    console.log('AuxiliarySalesRatioValidationStrategy actual ', actual);
    console.log('this.auxiliaryThreshold ', this.auxiliaryThreshold);
    if (response.isFreeApproval) {
      console.log('无需审核', response.isFreeApproval);
      console.log('AuxiliarySalesRatioValidationStrategy message', messages);
      return messages;
    }
    if (actual > this.auxiliaryThreshold) {
      messages.push(
        `辅销比例 ${toPercent(response.auxiliarySalesRatio)}% 超过上限 ${(
          this.auxiliaryThreshold * 100
        ).toFixed(0)}%，需审批`,
      );
    }
    console.log('AuxiliarySalesRatioValidationStrategy message', messages);
    return messages;
  }
}
// 未产生额度，却使用额度无法确认比例校验
export class UsePreRioValidationStrategy implements ValidationStrategy {
  async validate(response: CheckOrderAmountResponse): Promise<string[]> {
    const messages: string[] = [];
    if (response.isFreeApproval) {
      console.log('无需审核', response.isFreeApproval);
      console.log('UsePreRioValidationStrategy message', messages);
      return messages;
    }
    if (
      parseFloat(response.orderSubsidyAmount) <= 0 &&
      (parseFloat(response.replenishAmount) > 0 ||
        parseFloat(response.auxiliarySalesAmount) > 0)
    ) {
      messages.push('当前未选中参与货补/辅销的产品，但使用了货补/辅销金额');
    }
    console.log('UsePreRioValidationStrategy message', messages);
    return messages;
  }
}

// 区域额度校验策略
@Injectable()
export class RegionQuotaValidationStrategy implements ValidationStrategy {
  constructor(
    @InjectRepository(CustomerCreditAmountInfoEntity)
    private creditAmountInfoRepository: Repository<CustomerCreditAmountInfoEntity>,
  ) {}

  async validate(
    response: CheckOrderAmountResponse,
    customerInfo: CustomerInfoEntity,
  ): Promise<string[]> {
    const messages: string[] = [];
    // 只有用了货补或辅销才查区域额度
    if (!response.replenishRatio && !response.auxiliarySalesRatio) {
      return messages;
    }
    const result = await this.creditAmountInfoRepository
      .createQueryBuilder('credit')
      .where('credit.region = :region', { region: customerInfo.region })
      .andWhere('credit.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
      .select([
        'SUM(credit.remain_auxiliary_sale_goods_amount) as totalAux',
        'SUM(credit.remain_replenishing_goods_amount) as totalRep',
      ])
      .getRawOne();

    const totalAux = parseFloat(result.totalAux || 0);
    const totalRep = parseFloat(result.totalRep || 0);

    if (totalRep < 0) {
      messages.push(`区域货补额度已超限（剩余 ${totalRep.toFixed(2)}）`);
    }
    if (totalAux < 0) {
      messages.push(`区域辅销额度已超限（剩余 ${totalAux.toFixed(2)}）`);
    }
    return messages;
  }
}
