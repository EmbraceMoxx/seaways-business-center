import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import * as config from 'config';

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

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    return payload;
  }
}
