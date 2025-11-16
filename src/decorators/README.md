# JWT Token 用户信息获取指南

## 概述

本系统使用JWT（JSON Web Token）进行用户认证，通过拦截器自动解析token中的用户信息。

## 实现原理

### 1. JWT策略 (`jwt.strategy.ts`)
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authUserService: AuthUserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从Authorization头提取token
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secretKey'),
    });
  }

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    // 验证用户是否存在且有效
    const user = await this.authUserService.findUserById(payload.userId);
    
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.enabled !== 1) {
      throw new UnauthorizedException('用户已被禁用');
    }

    if (user.deleted === 1) {
      throw new UnauthorizedException('用户已被删除');
    }

    // 返回token中的用户信息
    return {
      userId: payload.userId,
      username: payload.username,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
```

### 2. JWT守卫 (`jwt-auth.guard.ts`)
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 自动验证token并解析用户信息
}
```

### 3. 当前用户装饰器 (`current-user.decorator.ts`)
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // 从请求中获取解析后的用户信息
  },
);
```

## 使用方法

### 1. 在控制器中使用JWT守卫

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiBearerAuth() // Swagger文档中显示需要Bearer token
@UseGuards(JwtAuthGuard) // 应用JWT守卫
@Controller('user')
export class UserController {
  // 控制器方法
}
```

### 2. 获取当前用户信息

```typescript
import { CurrentUser, JwtUserPayload } from '@src/decorators/current-user.decorator';

@Get('profile')
async getProfile(@CurrentUser() user: JwtUserPayload) {
  // user 包含从JWT token中解析的用户信息
  console.log(user.userId);    // 用户ID
  console.log(user.username);  // 用户名
  return user;
}
```

### 3. 完整的控制器示例

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { SuccessResponseDto } from '@src/dto';
import { AuthUserService } from '../user/auth-user.service';

@ApiTags('用户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private authUserService: AuthUserService) {}
  
  @ApiOperation({ summary: '获取用户信息' })
  @Get('get-user-info')
  async getUserInfo(@CurrentUser() user: JwtUserPayload): Promise<SuccessResponseDto<any>> {
    // 获取用户信息，包含角色和资源
    const userInfo = await this.authUserService.getUserWithRolesAndResources(user.userId);
    
    // 返回的用户信息包含：
    // - 基本用户信息
    // - roles: 角色详细信息数组
    // - roleIds: 角色ID集合 [1, 2, 3]
    // - resources: 资源信息数组
    
    const { password, ...safeUserInfo } = userInfo;
    return new SuccessResponseDto(safeUserInfo, '获取用户信息成功');
  }

  @ApiOperation({ summary: '获取用户角色ID集合' })
  @Get('role-ids')
  async getUserRoleIds(@CurrentUser() user: JwtUserPayload): Promise<SuccessResponseDto<number[]>> {
    const userInfo = await this.authUserService.getUserWithRolesAndResources(user.userId);
    return new SuccessResponseDto(userInfo.roleIds, '获取角色ID集合成功');
  }
}
```

## JWT Token结构

JWT token包含以下用户信息：

```typescript
interface JwtUserPayload {
  userId: number;      // 用户ID
  username: string;    // 用户名（通常是手机号）
  businessSystemId?: string; // 业务系统ID（可选）
  iat?: number;        // token签发时间
  exp?: number;        // token过期时间
}
```

## 请求头格式

客户端需要在请求头中携带JWT token：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 响应示例

### 获取用户信息响应

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "businessSystemId": 1,
    "accountType": "EMPLOYEE_ACCOUNT",
    "username": "张三",
    "employeeId": 123,
    "employeeCode": "EMP001",
    "organizationId": 1,
    "nickName": "小张",
    "cellphoneNum": "13700000001",
    "enabled": 1,
    "createdTime": "2025-01-13T05:51:18.000Z",
    "revisedTime": "2025-01-13T05:51:18.000Z",
    "roles": [
      {
        "id": 1,
        "roleName": "管理员",
        "roleDesc": "系统管理员角色"
      },
      {
        "id": 2,
        "roleName": "普通用户",
        "roleDesc": "普通用户角色"
      }
    ],
    "roleIds": [1, 2],
    "resources": [
      {
        "id": 1,
        "resourceName": "用户管理",
        "resourceUrl": "/user"
      }
    ]
  },
  "message": "获取用户信息成功",
  "timestamp": 1640995200000
}
```

## 错误处理

如果token无效或过期，系统会自动返回401未授权错误：

```json
{
  "code": 500,
  "data": null,
  "message": "Unauthorized",
  "timestamp": 1640995200000
}
```

## 增强功能

### 1. 自动用户验证
- JWT策略会自动验证用户是否存在
- 检查用户是否被禁用（enabled !== 1）
- 检查用户是否被删除（deleted === 1）
- 无效用户会自动抛出401未授权异常

### 2. 无需传递用户ID
- 所有需要用户ID的操作都可以从token中获取
- 无需在请求体中传递用户ID
- 提高了安全性和便利性

### 3. 实时用户状态检查
- 每次请求都会验证用户的最新状态
- 如果用户被禁用或删除，token会立即失效
- 确保只有有效用户才能访问受保护的接口

## 注意事项

1. **Token过期**: JWT token有过期时间，过期后需要重新登录获取新token
2. **Token刷新**: 可以使用refresh token获取新的access token
3. **安全性**: 不要在客户端存储敏感信息，token中只包含必要的用户标识
4. **权限验证**: 获取用户信息后，还需要根据业务需求进行权限验证
5. **性能考虑**: 每次请求都会查询数据库验证用户状态，确保数据一致性

## 最佳实践

1. **使用装饰器**: 推荐使用`@CurrentUser()`装饰器而不是`@Req()`
2. **类型安全**: 使用`JwtUserPayload`类型确保类型安全
3. **错误处理**: 在控制器中适当处理用户不存在的异常
4. **API文档**: 使用`@ApiBearerAuth()`装饰器生成正确的API文档

# Http代理使用指南

## 概述

通过Http代理，调用其他服务中的接口

## 使用方法

### 1. 在config中配置请求前缀

```JSON
# HTTP Proxy
httpProxy:
  baseURL: http://192.168.110.163:5183/api
```

### 2. 请求示例 

```typescript
  import { CurrentToken } from '@src/decorators/current-token.decorator';
  import { HttpProxyService } from '@shared/http-proxy.service';
  import { UserEndpoints } from '@src/constants/index';

  @Get('user-roles')
  async getUserRolesList(
    @CurrentToken() token: string,
  ) {
    const userRoles  = await this.httpProxyServices.get(
      UserEndpoints.CURRENT_USER_ROLES, 
      token,
    );
    this.logger.log(`CURRENT_USER_ROLES:${JSON.stringify(userRoles)}`);
  }
```
