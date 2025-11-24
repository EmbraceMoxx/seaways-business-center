export interface ProcessedResult {
  processedCount: number;
  exceptionCount: number;
  businessSuccessCount: number;
  businessFailedCount: number;
  processedTime: number; // in milliseconds
  message: string;
}

export interface OrderEventMainInfo {
  id: string;
  eventType: string;
  businessId: string;
}

export interface BusinessResult {
  success: boolean;
  message: string; // 用于 event.eventMessage
  businessStatus?: string; // 业务状态，如订单状态
  businessMessage?: string; // 用于前端或业务展示
  data?: any; // 附加数据（如 innerOrderCode）
}
