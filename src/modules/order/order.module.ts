import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { OrderController } from '@modules/order/controller/order.controller';
import { OrderService } from '@modules/order/service/order.service';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { JstHttpModule } from '../erp/jushuitan/jst-http.module';
import { OrderEventService } from './service/order-event.service';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { BusinessLogEntity } from '@modules/common/business-log/entity/business-log.entity';
import { CustomerCreditLimitDetailService } from '@modules/customer/services/customer-credit-limit-detail.service';
import { CustomerCreditLimitDetailEntity } from '@modules/customer/entities/customer-credit-limit-detail.entity';
import { CustomerCreditLimitService } from '@modules/customer/services/customer-credit-limit.service';
import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from '@modules/customer/entities/customer-monthly-credit-limit.entity';
import { CustomerService } from '@modules/customer/services/customer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItemEntity,
      OrderMainEntity,
      CommodityInfoEntity,
      CustomerInfoEntity,
      BusinessLogEntity,
      CustomerCreditLimitDetailEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
    ]),
    JstHttpModule,
  ],
  providers: [
    OrderService,
    CommodityService,
    OrderEventService,
    BusinessLogService,
    CustomerCreditLimitDetailService,
    CustomerCreditLimitService,
    CustomerService,
  ],

  controllers: [OrderController],
})
export class OrderModule {}
