import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAddressEntity } from './customer-address.entity';
import { CustomerAddressService } from './customer-address.service';
import { CustomerAddressController } from './customer-address.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerAddressEntity])],
  providers: [CustomerAddressService],
  controllers: [CustomerAddressController],
})
export class CustomerAddressModule {}
