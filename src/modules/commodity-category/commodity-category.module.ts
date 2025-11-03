import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommodityCategoryEntity } from './commodity-category.entity';
import { CommodityCategoryService } from './commodity-category.service';
import { CommodityCategoryController } from './commodity-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommodityCategoryEntity])],
  providers: [CommodityCategoryService],
  controllers: [CommodityCategoryController],
  exports: [CommodityCategoryService],
})
export class CommodityCategoryModule {}
