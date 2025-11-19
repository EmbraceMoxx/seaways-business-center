import { OrderItem, ReceiverAddress } from '@src/dto';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import {
  BooleanStatusEnum,
  GlobalStatusEnum,
} from '@src/enums/global-status.enum';
import * as dayjs from 'dayjs';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { OrderItemTypeEnum } from '@src/enums/order-item-type.enum';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { IdUtil } from '@src/utils';

export class OrderConvertHelper {
  static convertCustomerInfo(
    orderMain: OrderMainEntity,
    customerInfo: CustomerInfoEntity,
  ) {
    orderMain.customerId = customerInfo.id;
    orderMain.customerName = customerInfo.customerName;
    orderMain.customerJstId = customerInfo.customerJstId;
    orderMain.region = customerInfo.region;
    orderMain.regionalHeadId = customerInfo.regionalHeadId;
    orderMain.regionalHeadName = customerInfo.regionalHead;
    orderMain.provincialHeadId = customerInfo.provincialHeadId;
    orderMain.provincialHeadName = customerInfo.provincialHead;
  }
  static convertReceiverAddressInfo(
    orderMain: OrderMainEntity,
    receiverAddress: ReceiverAddress,
  ) {
    orderMain.receiverProvince = receiverAddress.receiverProvince;
    orderMain.receiverCity = receiverAddress.receiverCity;
    orderMain.receiverDistrict = receiverAddress.receiverDistrict;
    orderMain.receiverAddress = receiverAddress.receiverAddress;
    orderMain.receiverName = receiverAddress.receiverName;
    orderMain.receiverPhone = receiverAddress.receiverPhone;
  }

  static buildOrderItems(
    orderId: string,
    goodsList: OrderItem[],
    commodityPriceMap: Map<string, CommodityInfoEntity>,
    user: JwtUserPayload,
    itemType: OrderItemTypeEnum,
    lastOperateProgram: string,
  ): OrderItemEntity[] {
    return goodsList.map((item) => {
      const { orderItem, commodityInfo } = OrderConvertHelper.buildOrderItem(
        orderId,
        item,
        commodityPriceMap,
      );
      // 按商品级别判断：有 itemId → 更新，没有 → 新增
      if (item.itemId) {
        orderItem.id = item.itemId;
      } else {
        orderItem.id = IdUtil.generateId();
        orderItem.creatorId = user.userId;
        orderItem.creatorName = user.username;
        orderItem.createdTime = dayjs().toDate();
      }

      orderItem.type = itemType;
      orderItem.lastOperateProgram = lastOperateProgram;

      const amount = parseFloat(orderItem.amount);

      switch (itemType) {
        case OrderItemTypeEnum.FINISHED_PRODUCT:
          orderItem.replenishAmount = commodityInfo.isQuotaInvolved
            ? (amount * 0.1).toFixed(2)
            : '0';
          orderItem.auxiliarySalesAmount = commodityInfo.isQuotaInvolved
            ? (amount * 0.03).toFixed(2)
            : '0';
          break;
        case OrderItemTypeEnum.REPLENISH_PRODUCT:
          orderItem.replenishAmount = orderItem.amount ?? '0';
          break;
        case OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT:
          orderItem.auxiliarySalesAmount = orderItem.amount ?? '0';
          break;
      }
      orderItem.reviserId = user.userId;
      orderItem.reviserName = user.username;
      orderItem.revisedTime = dayjs().toDate();
      return orderItem;
    });
  }
  static buildOrderItem(
    orderId: string,
    item: OrderItem,
    commodityPriceMap: Map<string, CommodityInfoEntity>,
  ) {
    const orderItem = new OrderItemEntity();
    orderItem.orderId = orderId;
    orderItem.commodityId = item.commodityId;
    const commodityInfo = commodityPriceMap.get(item.commodityId);
    orderItem.name = commodityInfo.commodityName;
    orderItem.aliasName = commodityInfo.commodityAliaName;
    orderItem.internalCode = commodityInfo.commodityInternalCode;
    orderItem.specInfo = commodityInfo.itemSpecInfo;
    orderItem.boxSpecPiece = commodityInfo.boxSpecPiece;
    orderItem.boxSpecInfo = commodityInfo.boxSpecInfo;
    orderItem.exFactoryPrice = commodityInfo.itemExFactoryPrice;
    orderItem.exFactoryBoxPrice = commodityInfo.boxExFactoryPrice;
    orderItem.isQuotaInvolved = commodityInfo.isQuotaInvolved;
    orderItem.boxQty = item.boxQty ?? 0;
    orderItem.qty = item.qty ?? 0;
    const amount = item.qty * parseFloat(commodityInfo.itemExFactoryPrice);
    orderItem.amount = amount.toFixed(2);
    orderItem.deleted = GlobalStatusEnum.NO;
    return { orderItem, commodityInfo };
  }

  /**
   * 根据商品列表计算总金额
   * @param goods 商品列表
   * @param commodityInfos 商品信息列表
   * @param onlySubsidyInvolved
   * @returns 计算后的总金额
   */
  static calculateTotalAmount(
    goods: OrderItem[],
    commodityInfos: CommodityInfoEntity[],
    onlySubsidyInvolved = false,
  ): number {
    // 创建商品ID到出厂价的映射
    const commodityPriceMap = new Map<string, number>();
    let filteredCommodities = commodityInfos;
    if (onlySubsidyInvolved) {
      filteredCommodities = commodityInfos.filter(
        (commodity) => commodity.isQuotaInvolved == BooleanStatusEnum.TRUE,
      );
    }
    filteredCommodities.forEach((commodity) => {
      commodityPriceMap.set(
        commodity.id,
        parseFloat(commodity.itemExFactoryPrice),
      );
    });

    // 计算总金额
    return goods
      .map((item) => {
        const price = commodityPriceMap.get(item.commodityId) || 0;
        return item.qty * price;
      })
      .reduce((sum, current) => sum + current, 0);
  }

  static convertOrderAmount(
    orderItemList: OrderItemEntity[],
    orderMain: OrderMainEntity,
    creditAmount: number,
    finishGoods: OrderItem[],
    replenishGoods: OrderItem[],
    auxiliaryGoods: OrderItem[],
  ) {
    const replenishAmount = orderItemList
      .filter((e) => OrderItemTypeEnum.FINISHED_PRODUCT === e.type)
      .map((e) => (e.replenishAmount ? parseFloat(e.replenishAmount) : 0))
      .reduce((sum, current) => sum + current, 0);
    console.log('replenishAmount', replenishAmount);
    orderMain.replenishAmount = String(replenishAmount);

    const auxiliarySalesAmount = orderItemList
      .filter((e) => OrderItemTypeEnum.FINISHED_PRODUCT === e.type)
      .map((e) =>
        e.auxiliarySalesAmount ? parseFloat(e.auxiliarySalesAmount) : 0,
      )
      .reduce((sum, current) => sum + current, 0);
    console.log('auxiliarySalesAmount', auxiliarySalesAmount);
    orderMain.auxiliarySalesAmount = String(auxiliarySalesAmount) || '0';

    const usedReplenishAmount = orderItemList
      .filter((e) => OrderItemTypeEnum.REPLENISH_PRODUCT === e.type)
      .map((e) => (e.amount ? parseFloat(e.amount) : 0))
      .reduce((sum, current) => sum + current, 0);
    console.log('usedReplenishAmount', usedReplenishAmount);
    orderMain.usedReplenishAmount = String(usedReplenishAmount) || '0';

    const usedAuxiliarySalesAmount = orderItemList
      .filter((e) => OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT === e.type)
      .map((e) => parseFloat(e.amount))
      .reduce((sum, current) => sum + current, 0);
    orderMain.usedAuxiliarySalesAmount =
      String(usedAuxiliarySalesAmount) || '0';

    orderMain.usedAuxiliarySalesRatio = (
      usedAuxiliarySalesAmount / creditAmount
    ).toFixed(4);
    orderMain.usedReplenishRatio = (usedReplenishAmount / creditAmount).toFixed(
      4,
    );
    // 汇总商品信息
    orderMain.finishedProductBoxCount = finishGoods
      .map((good) => good.boxQty)
      .reduce((sum, current) => sum + current, 0);
    orderMain.replenishProductBoxCount = replenishGoods
      .map((good) => good.boxQty)
      .reduce((sum, current) => sum + current, 0);
    orderMain.auxiliarySalesProductCount = auxiliaryGoods
      .map((good) => good.qty)
      .reduce((sum, current) => sum + current, 0);
  }
}
