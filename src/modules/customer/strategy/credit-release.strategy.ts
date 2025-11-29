import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import {
  ConfirmAmountVector,
  StandardConfirmStrategy,
} from '@modules/customer/strategy/credit-confrim.strategy';
import {
  CancelAmountVector,
  JstPostCancelStrategy,
  JstPreCancelStrategy,
  StandardCancelStrategy,
} from '@modules/customer/strategy/credit-cancel.strategy';
import {
  StandardUpdateStrategy,
  UpdateAmountVector,
} from '@modules/customer/strategy/credit-update.strategy';

export interface ICreditReleaseStrategy<V = CancelAmountVector> {
  apply(credit: CustomerCreditAmountInfoEntity, vec: V): void;
}

/* ---------- 取消 ---------- */
export type CreditReleaseStrategyFlag = 'JST_PRE' | 'JST_POST' | 'STANDARD';

export class CancelStrategyFactory {
  private static readonly MAP: Map<
    CreditReleaseStrategyFlag,
    ICreditReleaseStrategy
  > = new Map([
    ['JST_PRE', new JstPreCancelStrategy()],
    ['JST_POST', new JstPostCancelStrategy()],
    ['STANDARD', new StandardCancelStrategy()],
  ]);
  static get(flag: CreditReleaseStrategyFlag): ICreditReleaseStrategy {
    const s = this.MAP.get(flag);
    if (!s) throw new Error(`Unknown CancelStrategyFlag: ${flag}`);
    return s;
  }
}
/* ---------- 确认 ---------- */
export class ConfirmStrategyFactory {
  private static readonly INSTANCE = new StandardConfirmStrategy();
  static get(): ICreditReleaseStrategy<ConfirmAmountVector> {
    return this.INSTANCE; // 目前只有一条实现，直接复用单例
  }
}

/* ---------- 修改 ---------- */
export class CreditUpdateStrategyFactory {
  private static readonly INSTANCE = new StandardUpdateStrategy();
  static get(): ICreditReleaseStrategy<UpdateAmountVector> {
    return this.INSTANCE;
  }
}
