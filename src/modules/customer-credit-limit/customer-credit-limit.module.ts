import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCreditLimitController } from './controllers/customer-credit-limit.controller';
import { CustomerCreditLimitService } from './services/customer-credit-limit.service';
import { CustomerCreditAmountInfoEntity } from './entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from './entities/customer-monthly-credit-limit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
    ]),
  ],
  providers: [CustomerCreditLimitService],
  controllers: [CustomerCreditLimitController],
  exports: [CustomerCreditLimitService],
})
export class CustomerCreditLimitModule {}
