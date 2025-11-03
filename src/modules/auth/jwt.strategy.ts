import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import * as config from 'config';

export interface JwtUserPayload {
  userId: string;
  username: string;
  businessSystemId?: string;
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

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    // 返回token中的用户信息
    return {
      userId: payload.userId,
      username: payload.username,
      businessSystemId: payload.businessSystemId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
