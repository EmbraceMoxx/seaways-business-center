import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { nanoid } from 'nanoid';
import * as dayjs from 'dayjs';
import {
  IStorageProvider,
  IStorageFile,
  UploadOptions,
  UploadResult,
} from './storage.interface';
import * as config from 'config';

@Injectable()
export class MinioStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(MinioStorageProvider.name);
  private client: Minio.Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly useSSL: boolean;
  private readonly port: number;

  constructor(private configService: ConfigService) {
    this.endpoint = config.get<string>('minio.endpoint');
    this.port = config.get<number>('minio.port') || 9000;
    this.useSSL = config.get<boolean>('minio.useSSL');
    this.bucket = config.get<string>('minio.bucket');

    this.client = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey: config.get<string>('minio.accessKey'),
      secretKey: config.get<string>('minio.secretKey'),
    });

    this.initBucket();
  }

  private async initBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" 创建成功`);
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'], // "s3:GetObject":读取/下载文件, "s3:ListBucket":列出bucket内容
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      }
    } catch (error) {
      this.logger.error(`初始化bucket失败: ${error.message}`);
    }
  }

  async upload(
    file: IStorageFile,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const { path: customPath, metadata = {} } = options;

    // 生成存储路径
    const storagePath =
      customPath || this.generateStoragePath(file.originalname);

    // 上传文件
    await this.client.putObject(
      this.bucket,
      storagePath,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'x-amz-meta-original-name': Buffer.from(file.originalname).toString(
          'base64',
        ),
        ...metadata,
      },
    );

    return {
      url: this.getObjectUrl(storagePath),
      path: storagePath,
      filename: storagePath.split('/').pop() || file.originalname,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async download(path: string): Promise<Buffer> {
    return null;
    // return new Promise((resolve, reject) => {
    //   const chunks: Buffer[] = [];

    //   this.client.getObject(this.bucket, path, (error, stream) => {
    //     if (error) {
    //       reject(new Error(`Failed to download file: ${error.message}`));
    //       return;
    //     }

    //     stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    //     stream.on('end', () => resolve(Buffer.concat(chunks)));
    //     stream.on('error', reject);
    //   });
    // });
  }

  async getPresignedUrl(path: string, expiresIn = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, path, expiresIn);
  }

  async delete(path: string): Promise<void> {
    await this.client.removeObject(this.bucket, path);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, path);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  private generateStoragePath(originalName: string): string {
    const date = dayjs('yyyy/MM/dd');
    const ext = originalName.split('.').pop() || '';
    const filename = `${nanoid()}.${ext}`;
    return `uploads/${date}/${filename}`;
  }

  private getObjectUrl(path: string): string {
    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}:${this.port}/${this.bucket}/${path}`;
  }
}
