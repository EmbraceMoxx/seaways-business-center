import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerInfoEntity } from './customer.entity';
import { CustomerCreditLimitService } from '../customer-credit-limit/services/customer-credit-limit.service';
import { CustomerCreditAmountInfoEntity } from '../customer-credit-limit/entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from '../customer-credit-limit/entities/customer-monthly-credit-limit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerInfoEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
    ]),
  ],
  providers: [CustomerService, CustomerCreditLimitService],
  controllers: [CustomerController],
  exports: [CustomerService],
})
export class CustomerModule {}
