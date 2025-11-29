import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { MoneyUtil } from '@utils/MoneyUtil';
import { ICreditReleaseStrategy } from '@modules/customer/strategy/credit-release.strategy';

export interface CancelAmountVector {
  shipped: string;
  auxiliary: string;
  auxiliaryUsed: string;
  replenishing: string;
  replenishingUsed: string;
}

/* ---------- 标准取消：先解冻，再减已使用 ---------- */
export class StandardCancelStrategy implements ICreditReleaseStrategy {
  apply(c: CustomerCreditAmountInfoEntity, v: CancelAmountVector): void {
    // 解冻
    c.frozenShippedAmount = MoneyUtil.sub(c.frozenShippedAmount, v.shipped);
    c.frozenSaleGoodsAmount = MoneyUtil.sub(
      c.frozenSaleGoodsAmount,
      v.auxiliary,
    );
    c.frozenUsedSaleGoodsAmount = MoneyUtil.sub(
      c.frozenUsedSaleGoodsAmount,
      v.auxiliaryUsed,
    );
    c.frozenReplenishingGoodsAmount = MoneyUtil.sub(
      c.frozenReplenishingGoodsAmount,
      v.replenishing,
    );
    c.frozenUsedReplenishingGoodsAmount = MoneyUtil.sub(
      c.frozenUsedReplenishingGoodsAmount,
      v.replenishingUsed,
    );

    // 减已使用
    c.shippedAmount = MoneyUtil.sub(c.shippedAmount, v.shipped);
    c.auxiliarySaleGoodsAmount = MoneyUtil.sub(
      c.auxiliarySaleGoodsAmount,
      v.auxiliary,
    );
    c.usedAuxiliarySaleGoodsAmount = MoneyUtil.sub(
      c.usedAuxiliarySaleGoodsAmount,
      v.auxiliaryUsed,
    );
    c.replenishingGoodsAmount = MoneyUtil.sub(
      c.replenishingGoodsAmount,
      v.replenishing,
    );
    c.usedReplenishingGoodsAmount = MoneyUtil.sub(
      c.usedReplenishingGoodsAmount,
      v.replenishingUsed,
    );
  }
}

/* ---------- 聚水潭-发货前取消：直接扣减已使用+冻结 ---------- */
export class JstPreCancelStrategy implements ICreditReleaseStrategy {
  apply(c: CustomerCreditAmountInfoEntity, v: CancelAmountVector): void {
    c.shippedAmount = MoneyUtil.sub(c.shippedAmount, v.shipped);
    c.auxiliarySaleGoodsAmount = MoneyUtil.sub(
      c.auxiliarySaleGoodsAmount,
      v.auxiliary,
    );
    c.usedAuxiliarySaleGoodsAmount = MoneyUtil.sub(
      c.usedAuxiliarySaleGoodsAmount,
      v.auxiliaryUsed,
    );
    c.frozenSaleGoodsAmount = MoneyUtil.sub(
      c.frozenSaleGoodsAmount,
      v.auxiliary,
    );
    c.frozenUsedSaleGoodsAmount = MoneyUtil.sub(
      c.frozenUsedSaleGoodsAmount,
      v.auxiliaryUsed,
    );

    c.replenishingGoodsAmount = MoneyUtil.sub(
      c.replenishingGoodsAmount,
      v.replenishing,
    );
    c.usedReplenishingGoodsAmount = MoneyUtil.sub(
      c.usedReplenishingGoodsAmount,
      v.replenishingUsed,
    );
    c.frozenReplenishingGoodsAmount = MoneyUtil.sub(
      c.frozenReplenishingGoodsAmount,
      v.replenishing,
    );
    c.frozenUsedReplenishingGoodsAmount = MoneyUtil.sub(
      c.frozenUsedReplenishingGoodsAmount,
      v.replenishingUsed,
    );
  }
}

/* ---------- 聚水潭-发货后取消：额度已累加，只扣减“已使用”，冻结不动 ---------- */
export class JstPostCancelStrategy implements ICreditReleaseStrategy {
  apply(c: CustomerCreditAmountInfoEntity, v: CancelAmountVector): void {
    c.shippedAmount = MoneyUtil.sub(c.shippedAmount, v.shipped);
    c.usedAuxiliarySaleGoodsAmount = MoneyUtil.sub(
      c.usedAuxiliarySaleGoodsAmount,
      v.auxiliaryUsed,
    );
    c.auxiliarySaleGoodsAmount = MoneyUtil.sub(
      c.auxiliarySaleGoodsAmount,
      v.auxiliary,
    );
    c.usedReplenishingGoodsAmount = MoneyUtil.sub(
      c.usedReplenishingGoodsAmount,
      v.replenishingUsed,
    );
    c.replenishingGoodsAmount = MoneyUtil.sub(
      c.replenishingGoodsAmount,
      v.replenishing,
    );
    // 冻结字段一律不碰
  }
}
