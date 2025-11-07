import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Observable, map } from 'rxjs';
import { RedisService } from '@modules/redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {
    super();
  }

  // 去掉 async，保持父类签名完全一致
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; // 公共路由直接放行

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException();

    // 黑名单检查（异步）
    const blackPromise = this.redisService
      .exists(`blacklist:${token}`)
      .then((isBlack) => {
        if (isBlack) throw new UnauthorizedException('Token has been revoked');

        // 挂载Token
        request.jwtToken = token;

        // 黑名单通过后，再走父类 JWT 验证
        return super.canActivate(context);
      });

    // 父类也可能返回 Observable，统一转成 Observable
    return new Observable((subscriber) => {
      Promise.resolve(blackPromise)
        .then((res) => {
          if (res instanceof Observable) return res.pipe(map(Boolean));
          return Boolean(res);
        })
        .then((val: boolean) => {
          subscriber.next(val);
          subscriber.complete();
        })
        .catch((err) => subscriber.error(err));
    });
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return;
    return authHeader.slice(7);
  }
}
