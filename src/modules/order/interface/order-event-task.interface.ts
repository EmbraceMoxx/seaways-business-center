export interface ProcessedResult {
  processedCount: number;
  failedCount: number;
  processedTime: number; // in milliseconds
  message: string;
}

export interface OrderEventMainInfo {
  id: string;
  eventType: string;
  businessId: string;
}
