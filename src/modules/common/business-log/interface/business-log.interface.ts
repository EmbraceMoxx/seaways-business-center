export interface BusinessLogInput {
  businessType: string;
  businessId: string;
  action: string;
  params?: any;
  result?: any;
  ipAddress?: string;
  creatorId: string;
  creatorName: string;
  operateProgram: string;
}
