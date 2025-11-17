export interface ApprovalContext {
  // 订单相关信息
  order: {
    id: string; // 订单ID
    creatorId: string; // 订单审请人
    customerId: string; // 客户ID
    regionalHeadId: string; // 大区负责人ID
    provincialHeadId: string; // 省区负责人ID
    usedReplenishRatio: number; // 货补占比
    usedAuxiliarySalesRatio: number; // 辅销品占比
  };
  // 当前操作人信息
  operator: {
    id: string;
    name: string;
  };
}
