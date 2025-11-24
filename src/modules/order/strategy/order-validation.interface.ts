// 定义校验策略接口
import { CheckOrderAmountResponse } from '@src/dto';
import { Injectable } from '@nestjs/common';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { Repository } from 'typeorm';

export interface ValidationStrategy {
  validate(
    response: CheckOrderAmountResponse,
    customerInfo: CustomerInfoEntity,
  ): Promise<string[]>;
}

// 货补比例校验策略
@Injectable()
export class ReplenishRatioValidationStrategy implements ValidationStrategy {
  async validate(response: CheckOrderAmountResponse): Promise<string[]> {
    const messages: string[] = [];
    if (
      response.replenishRatio &&
      parseFloat(response.replenishRatio) >= 0.05
    ) {
      messages.push(
        '当前货补使用比例为：' +
          (parseFloat(response.replenishRatio) * 100).toFixed(2) +
          '%',
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
  async validate(response: CheckOrderAmountResponse): Promise<string[]> {
    const messages: string[] = [];
    if (
      response.auxiliarySalesRatio &&
      parseFloat(response.auxiliarySalesRatio) >= 0.003
    ) {
      messages.push(
        '当前辅销使用比例为：' +
          (parseFloat(response.auxiliarySalesRatio) * 100).toFixed(2) +
          '%',
      );
    }
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
    if (response.auxiliarySalesRatio || response.replenishRatio) {
      console.log('进入区域统计逻辑：', customerInfo.region);
      // 使用一条SQL查询同时获取两个总和
      const result = await this.creditAmountInfoRepository
        .createQueryBuilder('credit')
        .where('credit.region = :region', { region: customerInfo.region })
        .andWhere('credit.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
        .select([
          'SUM(credit.remain_auxiliary_sale_goods_amount) as totalAuxiliarySales',
          'SUM(credit.remain_replenishing_goods_amount) as totalReplenishing',
        ])
        .getRawOne();
      if (result.totalAuxiliarySales < 0 || result.totalReplenishing < 0) {
        messages.push(
          `当前区域剩余货补额度${result.totalReplenishing},辅销剩余额度：${result.totalAuxiliarySales};区域额度已超限；`,
        );
      }
    }
    return messages;
  }
}
