import { Injectable, Logger } from '@nestjs/common';
import { HttpProxyService } from '@shared/http-proxy.service';
import { OrderUserQueryDto } from '@src/dto';
import { UserEndpoints } from '@src/constants';
import * as config from 'config';

@Injectable()
export class UserService{
  private readonly logger = new Logger(UserService.name);
  constructor(
    private httpProxyServices: HttpProxyService,
  ) {}
  async getRangeOfOrderQueryUser(
    token: string,
    userId: string,
  ): Promise<OrderUserQueryDto> {
    const userDto = new OrderUserQueryDto();
    userDto.isQueryAll = false;
    // 获取当前用户所属角色
    const userRoles = await this.httpProxyServices.get(
      UserEndpoints.USER_ROLES(userId),
      token,
    );
    this.logger.log(`userRoles: ${JSON.stringify(userRoles)}`);
    if (userRoles) {
      const idsStr = config.get('role.ids');
      this.logger.log(`idsStr: ${idsStr}`);
      const roleIds = idsStr ? idsStr.split(',') : [];
      const targetRole = userRoles.find((role) =>
        roleIds.includes(role.roleId), // 精确匹配
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
        this.logger.log(`查询用户及下级返回ID结果：${JSON.stringify(userList)}`);
        // 收集所有用户的 id 字段
        if (userList && Array.isArray(userList)) {
          userDto.principalUserIds = userList.map((user) => user.id);
        } else {
          userDto.principalUserIds = [];
        }
        return userDto;
      }
    }

    return userDto;
  }
}