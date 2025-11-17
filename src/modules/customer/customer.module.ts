import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 客户管理
import { CustomerInfoEntity } from './entities/customer.entity';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';

// 客户月度额度信息
import { CustomerMonthlyCreditLimitEntity } from './entities/customer-monthly-credit-limit.entity';

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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerInfoEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
      CustomerAddressEntity,
      CustomerCreditLimitDetailEntity,
    ]),
  ],
  providers: [
    CustomerService,
    CustomerCreditLimitService,
    CustomerAddressService,
    CustomerCreditLimitDetailService,
  ],
  controllers: [
    CustomerController,
    CustomerAddressController,
    CustomerCreditLimitController,
    CustomerCreditLimitDetailController,
  ],
  exports: [CustomerService],
})
export class CustomerModule {}
