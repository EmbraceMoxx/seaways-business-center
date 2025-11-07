import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AccountModule } from '@modules/auth/account.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from '@modules/redis/redis.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CommodityModule } from '@modules/commodity/commodity.module';
import { CommodityCategoryModule } from '@modules/commodity-category/commodity-category.module';
import { SharedModule } from '@modules/shared/shared.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    AccountModule,
    CacheModule.register({ isGlobal: true }),
    RedisModule,
    CommodityModule,
    CommodityCategoryModule,
    SharedModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
