import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCreditLimitDetailController } from './customer-credit-limit-detail.controller';
import { CustomerCreditLimitDetailService } from './customer-credit-limit-detail.service';
import { CustomerCreditLimitDetail } from './customer-credit-limit-detail.entity';
import { CustomerCreditLimitService } from '@src/modules/customer-credit-limit/services/customer-credit-limit.service';
import { CustomerCreditAmountInfoEntity } from '../customer-credit-limit/entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from '../customer-credit-limit/entities/customer-monthly-credit-limit.entity';
import { CustomerInfoEntity } from '../customer/customer.entity';
import { CustomerService } from '../customer/customer.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCreditLimitDetail,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
      CustomerInfoEntity,
    ]),
  ],
  providers: [
    CustomerCreditLimitDetailService,
    CustomerCreditLimitService,
    CustomerService,
  ],
  controllers: [CustomerCreditLimitDetailController],
})
export class CustomerCreditLimitDetailModule {}
