import { ApiProperty } from '@nestjs/swagger';

export class CheckOrderAmountRequest {
  @ApiProperty({ description: '客户ID', example: 1 })
  private customerId: string;
  @ApiProperty({ description: '成品商品集合' })
  private finishGoods: OrderItem[];
  @ApiProperty({ description: '货补商品集合' })
  private replenishGoods: OrderItem[];
  @ApiProperty({ description: '辅销商品集合' })
  private auxiliaryGoods: OrderItem[];
}

export class AddOfflineOrderRequest {
  @ApiProperty({ description: '客户ID', example: 1 })
  private customerId: string;
  @ApiProperty({ description: '下单联系人' })
  private contact: string;
  @ApiProperty({ description: '下单联系人电话' })
  private contactPhone: string;
  @ApiProperty({ description: '收货地址信息' })
  private receiverAddress: ReceiverAddress;
  @ApiProperty({ description: '成品商品集合' })
  private finishGoods: OrderItem[];
  @ApiProperty({ description: '货补商品集合' })
  private replenishGoods: OrderItem[];
  @ApiProperty({ description: '辅销商品集合' })
  private auxiliaryGoods: OrderItem[];
  @ApiProperty({ description: '备注信息' })
  private remark: string;
}

export class ReceiverAddress {
  @ApiProperty({ description: '收货省份' })
  private receiverProvince: string;
  @ApiProperty({ description: '收货城市' })
  private receiverCity: string;
  @ApiProperty({ description: '收货区/街道' })
  private receiverDistrict: string;
  @ApiProperty({ description: '收货人详细地址' })
  private receiverAddress: string;
  @ApiProperty({ description: '收货人姓名' })
  private receiverName: string;
  @ApiProperty({ description: '收货人电话' })
  private receiverPhone: string;
}
export class UpdateOfflineOrderRequest {
  @ApiProperty({ description: '订单ID', example: 1 })
  private orderId: string;
  @ApiProperty({ description: '客户ID', example: 1 })
  private customerId: string;
  @ApiProperty({ description: '下单联系人' })
  private contact: string;
  @ApiProperty({ description: '下单联系人电话' })
  private contactPhone: string;
  @ApiProperty({ description: '收货地址信息' })
  private receiverAddress: ReceiverAddress;
  @ApiProperty({ description: '成品商品集合' })
  private finishGoods: OrderItem[];
  @ApiProperty({ description: '货补商品集合' })
  private replenishGoods: OrderItem[];
  @ApiProperty({ description: '辅销商品集合' })
  private auxiliaryGoods: OrderItem[];
  @ApiProperty({ description: '备注信息' })
  private remark: string;
}
export class CancelOrderRequest {
  @ApiProperty({ description: '取消原因' })
  private cancelReason: string;
}

export class CheckOrderAmountResponse {
  @ApiProperty({ description: '客户ID' })
  private customerId: string;
  @ApiProperty({ description: '客户名称' })
  private customerName: string;
  @ApiProperty({ description: '订单金额' })
  private orderAmount: string;
  @ApiProperty({ description: '货补金额' })
  private replenishAmount: string;
  @ApiProperty({ description: '辅助金额' })
  private auxiliarySalesAmount: string;
  @ApiProperty({ description: '货补比例' })
  private replenishRatio: string;
  @ApiProperty({ description: '辅销比例' })
  private auxiliarySalesRatio: string;
  @ApiProperty({ description: '校验结果' })
  private message: string;
}

export class OrderItem {
  @ApiProperty({ description: '项目ID' })
  private itemId: string;
  @ApiProperty({ description: '订单ID' })
  private orderId: string;
  @ApiProperty({ description: '商品ID' })
  private commodityId: string;
  @ApiProperty({ description: '箱数' })
  private boxQty: number;
  @ApiProperty({ description: '推单数量' })
  private qty: number;
  @ApiProperty({ description: '出厂价' })
  private exFactoryPrice: string;
}
