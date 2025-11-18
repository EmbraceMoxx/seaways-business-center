import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PageRequestDto } from '@src/dto/common/common.dto';

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
  @ApiProperty({ description: '额度计算订单总额' })
  orderSubsidyAmount: string;
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

/**
 * 客户地址管理列表查询参数DTO
 */
export class QueryOrderDto extends PageRequestDto {
  @ApiProperty({
    description: '线上订单号',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '线上订单号必须是字符串' })
  onlineOrderCode?: string;

  @ApiProperty({
    description: '内部单号',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '内部单号必须是字符串' })
  oriInnerOrderCode?: string;

  @ApiProperty({
    description: '客户名称',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '客户名称必须是字符串' })
  customerName?: string;

  @ApiProperty({
    description: '订单编号',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '订单编号必须是字符串' })
  orderCode?: string;

  @ApiProperty({
    description: '订单状态',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '订单状态必须是字符串' })
  orderStatus?: string;
}

/**
 * 订单列表信息响应DTO
 */
export class OrderInfoResponseDto {
  @ApiProperty({
    description: '主键id',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: '订单编号, 全局唯一，格式："XX" + YYYYMMDD + NNNNNN',
    example: 'xx20251111NNNNNN',
  })
  orderCode: string;

  @ApiProperty({
    description: '线上订单号, 格式: "CCCCC"(业务代码) + YYYYMMDD + NNN',
    example: 'CCCCC20251111NNNNNN',
  })
  onlineOrderCode: string;

  @ApiProperty({
    description: '原内部单号(聚水潭内部单号)',
    example: '111',
  })
  oriInnerOrderCode: string;

  @ApiProperty({
    description: '订单状态',
    example: '省区审批中',
  })
  orderStatus: string;

  @ApiProperty({
    description: '客户ID',
    example: '12333',
  })
  customerId: string;

  @ApiProperty({
    description: '客户名称',
    example: '李四',
  })
  customerName: string;

  @ApiProperty({
    description: '订单总金额(发货金额），单位：元',
    example: '1000.0',
  })
  amount: string;

  @ApiProperty({
    description: '产生的货补金额, 单位：元',
    example: '150.0',
  })
  replenishAmount: string;

  @ApiProperty({
    description: '产生辅销金额, 单位：元',
    example: '150.0',
  })
  auxiliarySalesAmount: string;

  @ApiProperty({
    description: '下单联系人',
    example: '张山',
  })
  contact: string;

  @ApiProperty({
    description: '下单联系人电话',
    example: '150887787889',
  })
  contactPhone: string;

  @ApiProperty({
    description: '创建时间(下单时间)',
    example: '2021-01-01T00:00:00Z',
  })
  createdTime: string;
}

export class GetOrderDetailDto {
  @ApiProperty({
    description: '订单ID',
    example: 'XX20251111123456',
  })
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsString({ message: '订单ID必须是字符串' })
  orderId: string;
}

export class OrderDetailItem {
  @ApiProperty({ description: '订单明细项ID' })
  id: string;

  @ApiProperty({ description: '商品类型' })
  type: string;

  @ApiProperty({ description: '商品名称' })
  name: string;

  @ApiProperty({ description: '商品别名' })
  alias: string;

  @ApiProperty({ description: '商品内部编码' })
  internalCode: string;

  @ApiProperty({ description: '规格信息' })
  specInfo: string;

  @ApiProperty({ description: '箱规信息' })
  boxSpecInfo: string;

  @ApiProperty({ description: '箱规件数' })
  boxSpecPiece: number;

  @ApiProperty({ description: '箱数' })
  boxQty: number;

  @ApiProperty({ description: '推单数量' })
  qty: number;

  @ApiProperty({ description: '出厂价' })
  exFactoryPrice: string;

  @ApiProperty({ description: '是否涉及配额' })
  isQuotaInvolved: number;

  @ApiProperty({ description: '金额' })
  amount: string;

  @ApiProperty({ description: '货补金额' })
  replenishAmount: string;

  @ApiProperty({ description: '辅销金额' })
  auxiliarySalesAmount: string;
}
export class OrderDetailResponseDto {
  @ApiProperty({ description: '订单ID' })
  id: string;

  @ApiProperty({ description: '订单编号' })
  orderCode: string;

  @ApiProperty({ description: '线上订单号' })
  onlineOrderCode: string;

  @ApiProperty({ description: '原内部单号' })
  oriInnerOrderCode: string;

  @ApiProperty({ description: '订单状态' })
  orderStatus: string;

  @ApiProperty({ description: '订单取消原因' })
  cancelledMessage: string;

  @ApiProperty({ description: '订单审核通过时间' })
  auditTime: string;

  @ApiProperty({ description: '订单推送时间' })
  pushTime: string;

  @ApiProperty({ description: '订单发货时间' })
  deliveryTime: string;

  @ApiProperty({ description: '客户ID' })
  customerId: string;

  @ApiProperty({ description: '客户名称' })
  customerName: string;

  @ApiProperty({ description: '区域负责人ID' })
  regionalHeadId: string;

  @ApiProperty({ description: '区域负责人名称' })
  regionalHeadName: string;

  @ApiProperty({ description: '省区负责人ID' })
  provincialHeadId: string;

  @ApiProperty({ description: '省区负责人名称' })
  provincialHeadName: string;

  @ApiProperty({ description: '下单联系人' })
  contact: string;

  @ApiProperty({ description: '下单联系人电话' })
  contactPhone: string;

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

  @ApiProperty({ description: '备注' })
  remark: string;

  @ApiProperty({ description: '订单总金额(发货金额），单位：元' })
  amount: string;

  @ApiProperty({ description: '产生的货补金额, 单位：元' })
  replenishAmount: string;

  @ApiProperty({ description: '产生辅销金额, 单位：元' })
  auxiliarySalesAmount: string;

  @ApiProperty({ description: '使用的货补金额, 单位：元' })
  usedReplenishAmount: string;

  @ApiProperty({ description: '使用的货补比例, 单位：%' })
  usedReplenishRatio: string;

  @ApiProperty({ description: '使用的辅销金额, 单位：元' })
  usedAuxiliarySalesAmount: string;

  @ApiProperty({ description: '使用的辅销比例, 单位：%' })
  usedAuxiliarySalesRatio: string;

  @ApiProperty({ description: '成品商品明细项列表' })
  finishGoods: OrderDetailItem[];

  @ApiProperty({ description: '货补商品明细项列表' })
  replenishGoods: OrderDetailItem[];

  @ApiProperty({ description: '辅销商品明细项列表' })
  auxiliaryGoods: OrderDetailItem[];
}
