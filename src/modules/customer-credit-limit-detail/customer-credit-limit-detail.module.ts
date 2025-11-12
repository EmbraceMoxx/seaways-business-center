import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCreditLimitDetailController } from './customer-credit-limit-detail.controller';
import { CustomerCreditLimitDetailService } from './customer-credit-limit-detail.service';
import { CustomerCreditLimitDetail } from './customer-credit-limit-detail.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CustomerCreditLimitDetail])],
  providers: [CustomerCreditLimitDetailService],
  controllers: [CustomerCreditLimitDetailController],
})
export class CustomerCreditLimitDetailModule {}
