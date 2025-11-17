import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { OrderController } from '@modules/order/controller/order.controller';
import { OrderService } from '@modules/order/service/order.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItemEntity,OrderMainEntity])],
  providers:[OrderService],
  controllers:[OrderController]
})
export class OrderModule {}