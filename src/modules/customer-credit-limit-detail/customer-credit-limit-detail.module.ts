import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCreditLimitDetailController } from './customer-credit-limit-detail.controller';
import { CustomerCreditLimitDetailService } from './customer-credit-limit-detail.service';
import { CustomerCreditLimitDetail } from './customer-credit-limit-detail.entity';
import { CustomerInfoEntity } from '../customer-credit-limit/entities/customer-info.entity';
import { CustomerCreditLimitService } from '@src/modules/customer-credit-limit/services/customer-credit-limit.service';
import { CustomerCreditAmountInfoEntity } from '../customer-credit-limit/entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from '../customer-credit-limit/entities/customer-monthly-credit-limit.entity';
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCreditLimitDetail,
      CustomerInfoEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
    ]),
  ],
  providers: [CustomerCreditLimitDetailService, CustomerCreditLimitService],
  controllers: [CustomerCreditLimitDetailController],
})
export class CustomerCreditLimitDetailModule {}
