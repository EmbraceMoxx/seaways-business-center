import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { MoneyUtil } from '@utils/MoneyUtil';
import { ICreditReleaseStrategy } from './credit-release.strategy';
export interface UpdateAmountVector {
  oldShipped: string; // 修改前已发货
  newShipped: string; // 修改后已发货
  oldAuxiliary: string;
  newAuxiliary: string;
  oldAuxiliaryUsed: string;
  newAuxiliaryUsed: string;
  oldReplenishing: string;
  newReplenishing: string;
  oldReplenishingUsed: string;
  newReplenishingUsed: string;
}
/**
 * 订单修改策略：
 * 对锁定、已发货、已使用全部做“增量”调整（可正可负）。
 * 正数 = 追加占用，负数 = 释放占用。
 */
export class StandardUpdateStrategy
  implements ICreditReleaseStrategy<UpdateAmountVector>
{
  apply(c: CustomerCreditAmountInfoEntity, vec: UpdateAmountVector): void {
    // 1. 计算差额（新 - 旧）
    const deltaShipped = MoneyUtil.sub(vec.newShipped, vec.oldShipped);
    const deltaAuxiliary = MoneyUtil.sub(vec.newAuxiliary, vec.oldAuxiliary);
    const deltaAuxiliaryUsed = MoneyUtil.sub(
      vec.newAuxiliaryUsed,
      vec.oldAuxiliaryUsed,
    );
    const deltaReplenishing = MoneyUtil.sub(
      vec.newReplenishing,
      vec.oldReplenishing,
    );
    const deltaReplenishingUsed = MoneyUtil.sub(
      vec.newReplenishingUsed,
      vec.oldReplenishingUsed,
    );

    // 2. 锁定字段 += 差额
    c.frozenShippedAmount = MoneyUtil.add(c.frozenShippedAmount, deltaShipped);
    c.frozenSaleGoodsAmount = MoneyUtil.add(
      c.frozenSaleGoodsAmount,
      deltaAuxiliary,
    );
    c.frozenUsedSaleGoodsAmount = MoneyUtil.add(
      c.frozenUsedSaleGoodsAmount,
      deltaAuxiliaryUsed,
    );
    c.frozenReplenishingGoodsAmount = MoneyUtil.add(
      c.frozenReplenishingGoodsAmount,
      deltaReplenishing,
    );
    c.frozenUsedReplenishingGoodsAmount = MoneyUtil.add(
      c.frozenUsedReplenishingGoodsAmount,
      deltaReplenishingUsed,
    );
  }
}
