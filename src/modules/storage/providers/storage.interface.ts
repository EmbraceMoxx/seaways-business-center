export interface IStorageFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

export interface UploadOptions {
  path?: string;
  metadata?: Record<string, any>;
  acl?: 'public' | 'private';
}

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  etag?: string;
}

export interface IStorageProvider {
  upload(file: IStorageFile, options?: UploadOptions): Promise<UploadResult>;
  download(path: string): Promise<Buffer>;
  getPresignedUrl(path: string, expiresIn?: number): Promise<string>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
