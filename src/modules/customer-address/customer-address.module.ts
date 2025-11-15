import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAddressEntity } from './customer-address.entity';
import { CustomerAddressService } from './customer-address.service';
import { CustomerAddressController } from './customer-address.controller';
import { CustomerService } from '../customer/customer.service';
import { CustomerCreditAmountInfoEntity } from '@modules/customer-credit-limit/entities/customer-credit-limit.entity';
import { CustomerInfoEntity } from '@modules/customer/customer.entity';
import { CustomerCreditLimitService } from '@modules/customer-credit-limit/services/customer-credit-limit.service';
import { CustomerMonthlyCreditLimitEntity } from '@modules/customer-credit-limit/entities/customer-monthly-credit-limit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerAddressEntity,
      CustomerInfoEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
    ]),
  ],
  providers: [
    CustomerAddressService,
    CustomerService,
    CustomerCreditLimitService,
  ],
  controllers: [CustomerAddressController],
})
export class CustomerAddressModule {}
