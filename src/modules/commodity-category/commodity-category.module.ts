import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommodityCategoryEntity } from './commodity-category.entity';
import { CommodityCategoryService } from './commodity-category.service';
import { CommodityCategoryController } from './commodity-category.controller';
import { CommodityService } from '../commodity/services/commodity.service';
import { CommodityInfoEntity } from '../commodity/entities/commodity-info.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommodityCategoryEntity, CommodityInfoEntity]),
  ],
  providers: [CommodityCategoryService, CommodityService],
  controllers: [CommodityCategoryController],
  exports: [CommodityCategoryService, CommodityService],
})
export class CommodityCategoryModule {}
