import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioStorageProvider } from '../providers/minio.provider';
import {
  IStorageProvider,
  IStorageFile,
  UploadOptions,
  UploadResult,
} from '../providers/storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private storageProvider: IStorageProvider;

  constructor(
    private configService: ConfigService,
    private minioProvider: MinioStorageProvider,
  ) {
    this.storageProvider = this.minioProvider;
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const storageFile: IStorageFile = {
      originalname: file.originalname,
      buffer: file.buffer,
      size: file.size,
      mimetype: file.mimetype,
    };

    return this.storageProvider.upload(storageFile, options);
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    options?: UploadOptions,
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.upload(file, options);
      results.push(result);
    }

    return results;
  }

  async download(path: string): Promise<Buffer> {
    return this.storageProvider.download(path);
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    return this.storageProvider.getSignedUrl(path, expiresIn);
  }

  async delete(path: string): Promise<void> {
    await this.storageProvider.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.storageProvider.exists(path);
  }
}
