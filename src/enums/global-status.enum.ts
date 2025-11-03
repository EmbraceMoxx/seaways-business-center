/**
 * 全局状态枚举
 * 用于统一管理系统中所有实体的启用/禁用和删除状态
 */
export enum GlobalStatusEnum {
  /** 启用/有效/是 */
  YES = 'YES',
  /** 禁用/无效/否 */
  NO = 'NO',
}

/**
 * 启用状态常量
 */
export const ENABLED_STATUS = {
  /** 启用 */
  ENABLED: GlobalStatusEnum.YES,
  /** 禁用 */
  DISABLED: GlobalStatusEnum.NO,
} as const;

/**
 * 删除状态常量
 */
export const DELETED_STATUS = {
  /** 未删除 */
  NOT_DELETED: GlobalStatusEnum.NO,
  /** 已删除 */
  DELETED: GlobalStatusEnum.YES,
} as const;

/**
 * 叶子节点状态常量
 */
export const LEAF_STATUS = {
  /** 是叶子节点 */
  IS_LEAF: GlobalStatusEnum.YES,
  /** 不是叶子节点 */
  NOT_LEAF: GlobalStatusEnum.NO,
} as const;
