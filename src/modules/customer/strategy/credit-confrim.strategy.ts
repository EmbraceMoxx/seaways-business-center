import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { MoneyUtil } from '@utils/MoneyUtil';
import { ICreditReleaseStrategy } from '@modules/customer/strategy/credit-release.strategy';

export interface ConfirmAmountVector {
  shipped: string;
  auxiliary: string;
  auxiliaryUsed: string;
  replenishing: string;
  replenishingUsed: string;
}

export class StandardConfirmStrategy
  implements ICreditReleaseStrategy<ConfirmAmountVector>
{
  apply(c: CustomerCreditAmountInfoEntity, v: ConfirmAmountVector): void {
    // 1. 解冻（冻结字段减少）
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

    // 2. 累加到“确认”（因为已收款）
    c.shippedAmount = MoneyUtil.add(c.shippedAmount, v.shipped);
    c.auxiliarySaleGoodsAmount = MoneyUtil.add(
      c.auxiliarySaleGoodsAmount,
      v.auxiliary,
    );
    c.replenishingGoodsAmount = MoneyUtil.add(
      c.replenishingGoodsAmount,
      v.replenishing,
    );
    // 已使用
    c.usedAuxiliarySaleGoodsAmount = MoneyUtil.add(
      c.usedAuxiliarySaleGoodsAmount,
      v.auxiliaryUsed,
    );
    c.usedReplenishingGoodsAmount = MoneyUtil.add(
      c.usedReplenishingGoodsAmount,
      v.replenishingUsed,
    );
  }
}
