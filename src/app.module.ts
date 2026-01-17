import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AccountModule } from '@modules/auth/account.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from '@modules/redis/redis.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CommodityModule } from '@modules/commodity/commodity.module';
import { SharedModule } from '@modules/shared/shared.module';
import { CustomerModule } from '@modules/customer/customer.module';
import { OrderModule } from '@modules/order/order.module';
import { BusinessLogModule } from './modules/common/business-log/business-log.module';
import { ApprovalModule } from '@modules/approval/approval.module';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '@modules/storage/storage.module';
import { ExcelModule } from '@modules/excel/excel.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    AccountModule,
    CacheModule.register({ isGlobal: true }),
    RedisModule,
    CommodityModule,
    SharedModule,
    CustomerModule,
    OrderModule,
    BusinessLogModule,
    ApprovalModule,
    ConfigModule.forRoot({ isGlobal: true }), // 全局可用
    StorageModule,
    ExcelModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
