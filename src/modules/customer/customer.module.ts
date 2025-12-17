import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 客户管理
import { CustomerInfoEntity } from './entities/customer.entity';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';

// 客户月度额度信息
import { CustomerMonthlyCreditLimitEntity } from './entities/customer-monthly-credit-limit.entity';
import { CustomerMonthlyCreditLimitService } from './services/customer-monthly-credit-limit.server';

// 客户地址管理
import { CustomerAddressEntity } from './entities/customer-address.entity';
import { CustomerAddressController } from './controllers/customer-address.controller';
import { CustomerAddressService } from './services/customer-address.service';

// 客户额度管理
import { CustomerCreditAmountInfoEntity } from './entities/customer-credit-limit.entity';
import { CustomerCreditLimitController } from './controllers/customer-credit-limit.controller';
import { CustomerCreditLimitService } from './services/customer-credit-limit.service';

// 客户额度流水明细管理
import { CustomerCreditLimitDetailEntity } from './entities/customer-credit-limit-detail.entity';
import { CustomerCreditLimitDetailController } from './controllers/customer-credit-limit-detail.controller';
import { CustomerCreditLimitDetailService } from './services/customer-credit-limit-detail.service';

// 系统日志
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { BusinessLogEntity } from '@modules/common/business-log/entity/business-log.entity';

// 订单管理
import { UserService } from '@modules/common/user/user.service';

// 商品客户价格信息
import { CommodityModule } from '@modules/commodity/commodity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerInfoEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
      CustomerAddressEntity,
      CustomerCreditLimitDetailEntity,
      BusinessLogEntity,
    ]),
    forwardRef(() => CommodityModule),
  ],
  providers: [
    CustomerService,
    CustomerCreditLimitService,
    CustomerAddressService,
    CustomerCreditLimitDetailService,
    BusinessLogService,
    UserService,
    CustomerMonthlyCreditLimitService,
  ],
  controllers: [
    CustomerController,
    CustomerAddressController,
    CustomerCreditLimitController,
    CustomerCreditLimitDetailController,
  ],
  exports: [
    CustomerService,
    CustomerCreditLimitService,
    CustomerMonthlyCreditLimitService,
    CustomerCreditLimitDetailService,
  ],
})
export class CustomerModule {}
