import { ApprovalActionEnum } from '@src/enums/approval.enum';

// 审批操作指令
export class ApprovalCommand {
  orderId: string;
  action: ApprovalActionEnum;
  remark: string;
}

// 审批流程上下文
export class CreateApprovalDto {
  orderId: string;
  creatorId: string;
  customerId: string;
  regionalHeadId: string;
  provincialHeadId?: string;
  usedReplenishRatio: number;
  usedAuxiliarySalesRatio: number;
  isNeedDirectorApproval: boolean;
  operatorId: string;
  operatorName: string;
}

// 取消审批Dto
export class CancelApprovalDto {
  orderId: string;
  operatorId: string;
  operatorName: string;
  reason: string;
}
