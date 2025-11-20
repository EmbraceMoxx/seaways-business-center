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

@Module({
  imports: [
    TypeOrmModule.forFeature([CommodityInfoEntity, CommodityCategoryEntity]),
  ],
  providers: [CommodityService, CommodityCategoryService],
  controllers: [CommodityController, CommodityCategoryController],
  exports: [CommodityService, CommodityCategoryService],
})
export class CommodityModule {}
