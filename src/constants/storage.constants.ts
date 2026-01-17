export enum StorageProvider {
  MINIO = 'minio',
  LOCAL = 'local',
}

export enum FileCategory {
  TEMPLATE = 'template',
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  OTHER = 'other',
}

export const MIME_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  csv: 'text/csv',
  txt: 'text/plain',
};
