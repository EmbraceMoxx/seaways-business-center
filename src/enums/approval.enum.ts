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
export const enum ApprovalActionEnum {
  AGREE = 'agree', // 同意
  REFUSE = 'refuse', // 拒绝
}

/**
 * 审批人指定方式
 */
export const enum AssigneeType {
  ROLE = 'ROLE', // 按角色
  USER = 'USER', // 按指定用户
  CUSTOMER_RESPONSIBLE = 'CUSTOMER_RESPONSIBLE', // 按客户负责人
}

/**
 * 审批策略
 */
export const enum ApprovalStrategy {
  ANY_ONE = 'ANY_ONE', // 任意一人通过即可
  ALL = 'ALL', // 需要全部通过
}

/**
 * 客户负责人类型
 */
export const enum CustomerResponsibleType {
  PROVINCIAL_HEAD = 'PROVINCIAL_HEAD', // 省区负责人
  REGIONAL_HEAD = 'REGIONAL_HEAD', // 大区负责人
}
