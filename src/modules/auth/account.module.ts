import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
// import { AccountController } from './account.controller';
// import { AuthAccountService } from './services/authAccountService';
// import { TokenService } from './services/token.service';
// import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
// import { UserModule } from '@modules/user/user.module';
// import { SmsModule } from '@modules/sms/sms.module';
// import { ResourceModule } from '@modules/resource/resource.module';
// import { BusinessSystemModule } from '@modules/business-system/business-system.module';
import * as config from 'config';

@Module({
  imports: [
    // UserModule,
    // SmsModule,
    // ResourceModule,
    // BusinessSystemModule,
    JwtModule.register({
      global: true,
      secret: config.get('jwt.secretKey'),
      signOptions: { expiresIn: '30d' },
    }),
  ],
  // controllers: [AccountController],
  providers: [
    Logger,
    // AuthAccountService,
    // TokenService,
    // LocalStrategy,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AccountModule {}
