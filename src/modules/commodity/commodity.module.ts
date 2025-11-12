import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommodityController } from './controllers/commodity.controller';
import { CommodityService } from './services/commodity.service';
import { CommodityInfoEntity } from './entities/commodity-info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommodityInfoEntity])],
  providers: [CommodityService],
  controllers: [CommodityController],
})
export class CommodityModule {}
