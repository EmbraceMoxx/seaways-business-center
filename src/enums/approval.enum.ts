/**
 * 审批任务状态枚举
 */
export const enum ApprovalTaskStatusEnum {
  /** 待处理 */
  PENDING = 'PENDING',
  /** 已通过 */
  APPROVED = 'APPROVED',
  /** 已拒绝 */
  REJECTED = 'REJECTED',
  /** 已跳过 */
  SKIPPED = 'SKIPPED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
}

/**
 * 审批实例状态枚举
 */
export const enum ApprovalInstanceStatusEnum {
  /** 审批中 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 已通过 */
  APPROVED = 'APPROVED',
  /** 已拒绝 */
  REJECTED = 'REJECTED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
}

/**
 * 审批操作枚举
 */
export enum ApprovalActionEnum {
  /** 同意 */
  AGREE = 'agree',
  /** 拒绝 */
  REFUSE = 'refuse',
}

/**
 * 审批人指定方式
 */
export const enum AssigneeTypeEnum {
  /** 按角色 */
  ROLE = 'ROLE',
  /** 按指定用户 */
  USER = 'USER',
  /** 按客户负责人 */
  CUSTOMER_RESPONSIBLE = 'CUSTOMER_RESPONSIBLE',
}

/**
 * 审批策略
 */
export const enum ApprovalStrategyEnum {
  /** 任意一人通过即可 */
  ANY_ONE = 'ANY_ONE',
  /** 需要全部通过 */
  ALL = 'ALL',
}

/**
 * 客户负责人类型
 */
export const enum CustomerResponsibleTypeEnum {
  /** 省区负责人 */
  PROVINCIAL_HEAD = 'PROVINCIAL_HEAD',
  /** 大区负责人 */
  REGIONAL_HEAD = 'REGIONAL_HEAD',
}

/**
 * 审批节点类型
 */
export const enum ApprovalNodeTypeEnum {
  /** 起始节点 */
  START = 'START',
  /** 审批节点 */
  APPROVAL = 'APPROVAL',
  /** 结束节点 */
  END = 'END',
}
