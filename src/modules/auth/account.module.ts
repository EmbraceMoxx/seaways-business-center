import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as config from 'config';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: config.get('jwt.secretKey'),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AccountModule {}
