import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { OrderController } from '@modules/order/controller/order.controller';
import { OrderService } from '@modules/order/service/order.service';
import { JstHttpModule } from '../erp/jushuitan/jst-http.module';
import { OrderEventService } from './service/order-event/order-event.service';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { BusinessLogEntity } from '@modules/common/business-log/entity/business-log.entity';
import { OrderPushService } from './service/order-push.service';
import { CommodityModule } from '../commodity/commodity.module';
import { OrderCheckService } from '@modules/order/service/order-check.service';
import { UserService } from '@modules/common/user/user.service';
import { OrderTaskController } from './controller/order-task.controller';
import { OrderEventTaskService } from './service/order-event/order-event-task.service';
import { ApprovalModule } from '@modules/approval/approval.module';
import { CustomerModule } from '@modules/customer/customer.module';
import {
  AuxiliarySalesRatioValidationStrategy,
  RegionQuotaValidationStrategy,
  ReplenishRatioValidationStrategy,
  UsePreRioValidationStrategy,
} from '@modules/order/strategy/order-validation.interface';
import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { EventExecutorRegistry } from './service/order-event/event-executor.registry';
import { OrderPushEventExecutor } from './service/order-event/executors/order-push-event.executor';
import {
  AUX_THRESHOLD_TOKEN,
  REP_REGION_THRESHOLD_TOKEN,
  REP_THRESHOLD_TOKEN,
} from '@modules/order/constant';
import { OrderSyncService } from '@modules/order/service/order-sync.service';
import { OrderJstService } from '@modules/order/service/order-jst.service';
import { OrderSyncController } from '@modules/order/controller/order-sync.controller';
import { OrderJstController } from '@modules/order/controller/order-jst.controller';
import { OrderSyncCancelService } from '@modules/order/strategy/order-sync-cancel.service';
import { ApprovalConfig } from '@src/configs/approval.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItemEntity,
      OrderMainEntity,
      BusinessLogEntity,
      CustomerCreditAmountInfoEntity,
    ]),
    JstHttpModule,
    CustomerModule,
    CommodityModule,
    ApprovalModule,
  ],
  providers: [
    OrderService,
    OrderPushService,
    OrderEventService,
    OrderEventTaskService,
    OrderSyncService,
    OrderJstService,
    OrderPushEventExecutor,
    {
      provide: EventExecutorRegistry,
      useFactory: (pushExecutor: OrderPushEventExecutor) => {
        return new EventExecutorRegistry([pushExecutor]);
      },
      inject: [OrderPushEventExecutor],
    },
    {
      provide: REP_THRESHOLD_TOKEN,
      inject: [ApprovalConfig],
      useFactory: (cfg: ApprovalConfig) =>
        Number(cfg.provinceReplenishmentFreeRatio ?? 0.0), // 读静态字段
    },
    {
      provide: REP_REGION_THRESHOLD_TOKEN,
      inject: [ApprovalConfig],
      useFactory: (cfg: ApprovalConfig) =>
        Number(cfg.maxReplenishmentFreeApprovalRatio ?? 0.1), // 读静态字段
    },
    {
      provide: AUX_THRESHOLD_TOKEN,
      inject: [ApprovalConfig],
      useFactory: (cfg: ApprovalConfig) =>
        Number(cfg.auxiliaryFreeRatio ?? 0.03),
    },
    ReplenishRatioValidationStrategy,
    AuxiliarySalesRatioValidationStrategy,
    RegionQuotaValidationStrategy,
    UsePreRioValidationStrategy,
    BusinessLogService,
    OrderCheckService,
    ApprovalConfig,
    OrderSyncCancelService,
    UserService,
  ],

  controllers: [
    OrderController,
    OrderTaskController,
    OrderSyncController,
    OrderJstController,
  ],
  exports: [
    OrderCheckService,
    AuxiliarySalesRatioValidationStrategy,
    ReplenishRatioValidationStrategy,
    UsePreRioValidationStrategy,
  ],
})
export class OrderModule {}
