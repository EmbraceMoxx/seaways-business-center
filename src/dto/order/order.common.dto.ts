import { ApiProperty } from '@nestjs/swagger';

export class OrderItem {
  @ApiProperty({ description: '项目ID' })
  itemId: string;
  @ApiProperty({ description: '订单ID' })
  orderId: string;
  @ApiProperty({ description: '商品ID' })
  commodityId: string;
  @ApiProperty({ description: '箱数' })
  boxQty: number;
  @ApiProperty({ description: '推单数量' })
  qty: number;
  @ApiProperty({ description: '出厂价' })
  exFactoryPrice: string;
}

export class CheckOrderAmountRequest {
  @ApiProperty({ description: '客户ID', example: 1 })
  customerId: string;
  @ApiProperty({ description: '成品商品集合' })
  finishGoods: OrderItem[];
  @ApiProperty({ description: '货补商品集合' })
  replenishGoods: OrderItem[];
  @ApiProperty({ description: '辅销商品集合' })
  auxiliaryGoods: OrderItem[];
}

export class ReceiverAddress {
  @ApiProperty({ description: '收货省份' })
  receiverProvince: string;
  @ApiProperty({ description: '收货城市' })
  receiverCity: string;
  @ApiProperty({ description: '收货区/街道' })
  receiverDistrict: string;
  @ApiProperty({ description: '收货人详细地址' })
  receiverAddress: string;
  @ApiProperty({ description: '收货人姓名' })
  receiverName: string;
  @ApiProperty({ description: '收货人电话' })
  receiverPhone: string;
}
export class AddOfflineOrderRequest {
  @ApiProperty({ description: '收货地址信息' })
  receiverAddress: ReceiverAddress;
  @ApiProperty({ description: '客户ID', example: 1 })
  customerId: string;
  @ApiProperty({ description: '下单联系人' })
  contact: string;
  @ApiProperty({ description: '下单联系人电话' })
  contactPhone: string;
  @ApiProperty({ description: '成品商品集合' })
  finishGoods: OrderItem[];
  @ApiProperty({ description: '货补商品集合' })
  replenishGoods: OrderItem[];
  @ApiProperty({ description: '辅销商品集合' })
  auxiliaryGoods: OrderItem[];
  @ApiProperty({ description: '备注信息' })
  remark: string;
}

export class UpdateOfflineOrderRequest {
  @ApiProperty({ description: '订单ID', example: 1 })
  orderId: string;
  @ApiProperty({ description: '客户ID', example: 1 })
  customerId: string;
  @ApiProperty({ description: '下单联系人' })
  contact: string;
  @ApiProperty({ description: '下单联系人电话' })
  contactPhone: string;
  @ApiProperty({ description: '收货地址信息' })
  receiverAddress: ReceiverAddress;
  @ApiProperty({ description: '成品商品集合' })
  finishGoods: OrderItem[];
  @ApiProperty({ description: '货补商品集合' })
  replenishGoods: OrderItem[];
  @ApiProperty({ description: '辅销商品集合' })
  auxiliaryGoods: OrderItem[];
  @ApiProperty({ description: '备注信息' })
  remark: string;
}
export class CancelOrderRequest {
  @ApiProperty({ description: '订单ID', example: 1 })
  orderId: string;
  @ApiProperty({ description: '取消原因' })
  cancelReason: string;
}

export class CheckOrderAmountResponse {
  @ApiProperty({ description: '客户ID' })
  customerId: string;
  @ApiProperty({ description: '客户名称' })
  customerName: string;
  @ApiProperty({ description: '订单金额' })
  orderAmount: string;
  @ApiProperty({ description: '货补金额' })
  replenishAmount: string;
  @ApiProperty({ description: '辅助金额' })
  auxiliarySalesAmount: string;
  @ApiProperty({ description: '货补比例' })
  replenishRatio: string;
  @ApiProperty({ description: '辅销比例' })
  auxiliarySalesRatio: string;
  @ApiProperty({ description: '校验结果' })
  message: string;
}
