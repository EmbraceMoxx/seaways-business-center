import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ExcelController } from './controllers/excel.controller';
import { ExcelService } from './services/excel.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    StorageModule,
  ],
  controllers: [ExcelController],
  providers: [ExcelService],
})
export class ExcelModule {}
