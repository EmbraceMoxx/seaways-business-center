import { OrderItem } from '@src/dto';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { OrderItemEntity } from '@modules/order/entities/order.item.entity';
import { IdUtil } from '@src/utils';
import {
  BooleanStatusEnum,
  GlobalStatusEnum,
} from '@src/enums/global-status.enum';
import * as dayjs from 'dayjs';

export class OrderConvertHelper {
  static buildOrderItem(
    orderId: string,
    finish: OrderItem,
    commodityPriceMap: Map<string, CommodityInfoEntity>,
    user: JwtUserPayload,
  ) {
    const orderItem = new OrderItemEntity();
    orderItem.id = IdUtil.generateId();
    orderItem.orderId = orderId;
    orderItem.commodityId = finish.commodityId;
    const commodityInfo = commodityPriceMap.get(finish.commodityId);
    orderItem.name = commodityInfo.commodityName;
    orderItem.aliasName = commodityInfo.commodityAliaName;
    orderItem.internalCode = commodityInfo.commodityInternalCode;
    orderItem.specInfo = commodityInfo.itemSpecInfo;
    orderItem.boxSpecPiece = commodityInfo.boxSpecPiece;
    orderItem.boxSpecInfo = commodityInfo.boxSpecInfo;
    orderItem.exFactoryPrice = commodityInfo.itemExFactoryPrice;
    orderItem.exFactoryBoxPrice = commodityInfo.boxExFactoryPrice;
    orderItem.isQuotaInvolved = commodityInfo.isQuotaInvolved;
    orderItem.boxQty = finish.boxQty ?? 0;
    orderItem.qty = finish.qty ?? 0;
    const amount = finish.qty * parseFloat(commodityInfo.itemExFactoryPrice);
    orderItem.amount = amount.toFixed(2);
    orderItem.deleted = GlobalStatusEnum.NO;
    orderItem.creatorId = user.userId;
    orderItem.creatorName = user.username;
    orderItem.createdTime = dayjs().toDate();
    orderItem.reviserId = user.userId;
    orderItem.reviserName = user.username;
    orderItem.revisedTime = dayjs().toDate();
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
}
