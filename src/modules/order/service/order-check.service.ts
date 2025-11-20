import { OrderUserQueryDto } from '@src/dto';
import { Injectable } from '@nestjs/common';
import { HttpProxyService } from '@shared/http-proxy.service';
import { UserEndpoints } from '@src/constants';
@Injectable()
export class OrderCheckService {
  constructor(private httpProxyServices: HttpProxyService) {}

  async getRangeOfOrderQueryUser(
    token: string,
    userId: string,
  ): Promise<OrderUserQueryDto> {
    console.log('token:', token);
    const userDto = new OrderUserQueryDto();
    userDto.isQueryAll = false;
    // 获取当前用户所属角色
    const userRoles = await this.httpProxyServices.get(
      UserEndpoints.USER_ROLES(userId),
      token,
    );
    console.log('userRoles', userRoles);
    if (userRoles) {
      // 过滤出包含 roleId 为 '645552106786394112' 的数据 todo 后续放到配置里
      const targetRole = userRoles.find(
        (role) => role.roleId === '645552106786394112',
      );
      if (targetRole) {
        // 在这里处理找到的目标角色数据
        userDto.isQueryAll = true;
        return userDto;
      } else {
        // 查询用户及下级
        const userList = await this.httpProxyServices.get(
          UserEndpoints.USER_SUB_LEVEL(userId),
          token,
        );
        console.log('userList:', userList);
        // 收集所有用户的 id 字段
        if (userList && Array.isArray(userList)) {
          userDto.principalUserIds = userList.map((user) => user.id);
        } else {
          userDto.principalUserIds = [];
        }
        return userDto;
      }
    }

    return null;
  }
}
