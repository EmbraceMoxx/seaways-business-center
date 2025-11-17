import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { OrderController } from '@modules/order/controller/order.controller';
import { OrderService } from '@modules/order/service/order.service';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItemEntity,
      OrderMainEntity,
      CommodityInfoEntity,
    ]),
  ],
  providers: [OrderService, CommodityService],
  controllers: [OrderController],
})
export class OrderModule {}
