// 操作码
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { BusinessLogInput } from '@modules/common/business-log/interface/business-log.interface';

export class CustomerLogHelper {
  static getCustomerOperate(
    user: JwtUserPayload,
    lastOperateProgram: string,
    customerId: string,
    customerName: string,
  ): BusinessLogInput {
    const businessType = 'CUSTOMER';
    // 具体日志内容
    const action = `${user.username}更新客户【${customerName}】信息`;
    const ipAddress = user.ipAddress || '';
    return {
      businessId: customerId,
      businessType: businessType,
      creatorId: user.userId,
      creatorName: user.username,
      action: action,
      operateProgram: lastOperateProgram,
      ipAddress: ipAddress,
    };
  }
}
