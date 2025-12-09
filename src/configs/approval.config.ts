import { Injectable } from '@nestjs/common';
import * as config from 'config';
@Injectable()
export class ApprovalConfig{
  /** 辅销免审批比例 */
  get auxiliaryFreeRatio(): number {
    return Number(config.get<string>('approval.freeRatio.auxiliary') ?? 0.03);
  }
  /** 有省区时货补免审批比例 */
  get provinceReplenishmentFreeRatio(): number {
    return Number(
      config.get<string>('approval.freeRatio.replenishment') ?? 0.0,
    );
  }
  /** 无省区时货补免审批比例 */
  get maxReplenishmentFreeApprovalRatio(): number {
    return Number(
      config.get<string>('approval.freeRatio.replenishmentNoProv') ?? 0.1,
    );
  }
}