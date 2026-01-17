import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageController } from './controllers/storage.controller';
import { StorageService } from './services/storage.service';
import { MinioStorageProvider } from './providers/minio.provider';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService, MinioStorageProvider],
  exports: [StorageService],
})
export class StorageModule {}
