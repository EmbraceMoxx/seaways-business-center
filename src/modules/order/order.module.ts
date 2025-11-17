import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { OrderController } from '@modules/order/controller/order.controller';
import { OrderService } from '@modules/order/service/order.service';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { CustomerModule } from '@modules/customer/customer.module';
import { CommodityModule } from '@modules/commodity/commodity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItemEntity,
      OrderMainEntity,
      CommodityInfoEntity,
      CustomerInfoEntity,
    ]),
    CustomerModule,
    CommodityModule,
  ],
  providers: [OrderService, CommodityService],
  controllers: [OrderController],
})
export class OrderModule {}
