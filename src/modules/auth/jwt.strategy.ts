import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import * as config from 'config';
import { Request } from 'express';

export interface JwtUserPayload {
  userId: string;
  username: string;
  nickName: string;
  businessSystemId?: string;
  ipAddress?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secretKey'),
    });
  }

  async validate(payload: JwtUserPayload,request: Request): Promise<JwtUserPayload> {
    // 返回token中的用户信息
    // 获取客户端 IP 地址
    const ipAddress = this.extractClientIp(request);
    console.log('ipAddress', ipAddress);
    return {
      userId: payload.userId,
      username: payload.username,
      nickName: payload.nickName,
      businessSystemId: payload.businessSystemId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
  // todo 补充获取IP地址
  private extractClientIp(request: Request): string {
    // 检查各种可能的头部字段
    // 检查 request.headers 是否存在
    if (request.headers) {
      // 检查各种可能的头部字段
      if (request.headers['x-forwarded-for']) {
        return (request.headers['x-forwarded-for'] as string).split(',')[0].trim();
      }

      if (request.headers['x-real-ip']) {
        return request.headers['x-real-ip'] as string;
      }
    }
    return request.socket?.remoteAddress || '';
  }
}
