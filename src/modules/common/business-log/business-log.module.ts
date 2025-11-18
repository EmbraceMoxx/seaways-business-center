import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessLogService } from './business-log.service';
import { BusinessLogController } from './business-log.controller';
import { BusinessLogEntity } from './entity/business-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessLogEntity])],
  providers: [BusinessLogService],
  controllers: [BusinessLogController],
  exports: [BusinessLogService],
})
export class BusinessLogModule {}
