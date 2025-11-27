// 操作码
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { BusinessLogInput } from '@modules/common/business-log/interface/business-log.interface';

export type OperateCode =
  | 'CREATE'
  | 'UPDATE'
  | 'CANCEL'
  | 'REJECT_ORDER'
  | 'CONFIRM_PAY'
  | 'PUSH_PAY'
  | 'PUSH_COMPLETION'
  | 'REGION_APPR'
  | 'PROVINCE_APPR'
  | 'DIRECTOR_APPR';

// 一条操作的完整定义
export interface OperateDef {
  code: OperateCode;
  logTmpl: string; // 日志模板，含 %s
}

// 操作字典：key 保持大写下划线风格（兼容老 key）
export const OrderOperateMap = {
  CREATE_ORDER: { code: 'CREATE', logTmpl: '%s创建订单' } satisfies OperateDef,
  UPDATE_ORDER: { code: 'UPDATE', logTmpl: '%s修改订单' } satisfies OperateDef,
  CANCEL_ORDER: { code: 'CANCEL', logTmpl: '%s取消订单' } satisfies OperateDef,
  REJECT_ORDER: {
    code: 'REJECT_ORDER',
    logTmpl: '%s驳回审批',
  } satisfies OperateDef,
  CONFIRM_ORDER_PAYMENT: {
    code: 'CONFIRM_PAY',
    logTmpl: '%s确认回款',
  } satisfies OperateDef,
  PUSH_ORDER_PAYMENT: {
    code: 'PUSH_PAY',
    logTmpl: '%s确认推单',
  } satisfies OperateDef,
  PUSH_ORDER_COMPLETION: {
    code: 'PUSH_COMPLETION',
    logTmpl: '%s推单完成',
  } satisfies OperateDef,
  REGION_APPROVAL_ORDER: {
    code: 'REGION_APPR',
    logTmpl: '大区经理%s审批了订单',
  } satisfies OperateDef,
  PROVINCE_APPROVAL_ORDER: {
    code: 'PROVINCE_APPR',
    logTmpl: '省区经理%s审批了订单',
  } satisfies OperateDef,
  DIRECTOR_APPROVAL_ORDER: {
    code: 'DIRECTOR_APPR',
    logTmpl: '总监%s审批了订单',
  } satisfies OperateDef,
} as const;

// 把 key 也导出成类型
export type OrderOperateKey = keyof typeof OrderOperateMap;
/** 校验外部字符串是不是合法 key */
export function isValidOrderOperateKey(k: string): k is OrderOperateKey {
  return k in OrderOperateMap;
}
export class OrderLogHelper {
  static getOrderOperate(
    user: JwtUserPayload,
    operate: string,
    lastOperateProgram: string,
    orderId: string,
  ): BusinessLogInput {
    const businessType = 'ORDER';
    // 具体日志内容
    const action = this.OrderOperateLogTemplate(user, operate);
    const ipAddress = user.ipAddress || '';
    return {
      businessId: orderId,
      businessType: businessType,
      creatorId: user.userId,
      creatorName: user.nickName,
      action: action,
      operateProgram: lastOperateProgram,
      ipAddress: ipAddress,
    };
  }
  static OrderOperateLogTemplate(
    user: JwtUserPayload,
    operate: string,
  ): string {
    if (!isValidOrderOperateKey(operate)) {
      console.warn(`Invalid operate key: ${operate}`);
      return '';
    }
    const { logTmpl } = OrderOperateMap[operate];
    return logTmpl.includes('%s')
      ? logTmpl.replace('%s', user.nickName)
      : logTmpl;
  }
}
