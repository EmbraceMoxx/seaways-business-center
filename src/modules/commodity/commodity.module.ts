import { Module, Global } from '@nestjs/common';
import { CommodityController } from './controllers/commodity.controller';

@Global()
@Module({
  providers: [],
  controllers: [CommodityController],
})
export class CommodityModule {}
