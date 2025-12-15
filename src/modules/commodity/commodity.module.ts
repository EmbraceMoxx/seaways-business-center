import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// 商品管理
import { CommodityInfoEntity } from './entities/commodity-info.entity';
import { CommodityController } from './controllers/commodity.controller';
import { CommodityService } from './services/commodity.service';

// 商品分类
import { CommodityCategoryEntity } from './entities/commodity-category.entity';
import { CommodityCategoryController } from './controllers/commodity-category.controller';
import { CommodityCategoryService } from './services/commodity-category.service';
import { CommodityBundledSkuInfoEntity } from '@modules/commodity/entities/commodity-bundled-sku-info.entity';
import { CustomerCommodityConfigEntity } from '@modules/commodity/entities/customer-commodity-config.entity';

// 商品价格客户管理
import { CommodityCustomerPriceEntity } from './entities/commodity-customer-price.entity';
import { CommodityCustomerPriceService } from './services/commodity-customer-price.server';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommodityInfoEntity,
      CommodityCategoryEntity,
      CommodityBundledSkuInfoEntity,
      CustomerCommodityConfigEntity,
      CommodityCustomerPriceEntity,
    ]),
  ],
  providers: [
    CommodityService,
    CommodityCategoryService,
    CommodityCustomerPriceService,
  ],
  controllers: [CommodityController, CommodityCategoryController],
  exports: [
    CommodityService,
    CommodityCategoryService,
    CommodityCustomerPriceService,
  ],
})
export class CommodityModule {}
