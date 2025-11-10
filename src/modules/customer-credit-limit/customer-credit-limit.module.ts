import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCreditLimitController } from './controllers/customer-credit-limit.controller';
import { CustomerCreditLimitService } from './services/customer-credit-limit.service';
import { CustomerCreditAmountInfoEntity } from './entities/customer-credit-limit.entity';
import { CustomerInfoEntity } from './entities/customer-info.entity';
import { CustomerMonthlyCreditLimitEntity } from './entities/customer-monthly-credit-limit.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCreditAmountInfoEntity,
      CustomerInfoEntity,
      CustomerMonthlyCreditLimitEntity,
    ]),
  ],
  providers: [CustomerCreditLimitService],
  controllers: [CustomerCreditLimitController],
})
export class CustomerCreditLimitModule {}
