import { Injectable, Logger } from '@nestjs/common';
import {
  AddOfflineOrderRequest,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  OrderDetailResponseDto,
  OrderInfoResponseDto,
  OrderItem,
  QueryOrderDto,
  UpdateOfflineOrderRequest,
} from '@src/dto/order/order.common.dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { TimeFormatterUtil } from '@utils/time-formatter.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BooleanStatusEnum, GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { OrderMainEntity } from '../entities/order.main.entity';
import { OrderItemEntity } from '../entities/order.item.entity';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { parseString } from 'xml2js';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CustomerService } from '@modules/customer/services/customer.service';
import { IdUtil } from '@src/utils';
import { OrderItemTypeEnum } from '@src/enums/order-item-type.enum';
import * as dayjs from 'dayjs';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderMainEntity)
    private orderRepository: Repository<OrderMainEntity>,
    @InjectRepository(OrderItemEntity)
    private orderItemRepository: Repository<OrderItemEntity>,
    private commodityService: CommodityService,
    private customerService: CustomerService,
  ) {
  }

  /**
   * 获取订单列表
   */
  async getOrderList(
    params: QueryOrderDto,
  ): Promise<{ items: OrderInfoResponseDto[]; total: number }> {
    try {
      const {
        onlineOrderCode,
        oriInnerOrderCode,
        customerName,
        orderCode,
        orderStatus,
        startTime,
        endTime,
        page,
        pageSize,
      } = params;

      let queryBuilder = this.orderRepository
        .createQueryBuilder('order')
        .select([
          'order.id as id',
          'order.order_code as orderCode',
          'order.online_order_code as onlineOrderCode',
          'order.ori_inner_order_code as oriInnerOrderCode',
          'order.order_status as orderStatus',
          'order.customer_id as customerId',
          'order.customer_name as customerName',
          'order.amount as amount',
          'order.replenish_amount as replenishAmount',
          'order.auxiliary_sales_amount as auxiliarySalesAmount',
          'order.contact as contact',
          'order.contact_phone as contactPhone',
          'order.created_time as createdTime',
        ])
        .where('order.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        });

      // 线上订单号
      if (onlineOrderCode) {
        queryBuilder = queryBuilder.andWhere(
          'order.online_order_code LIKE :onlineOrderCode',
          {
            onlineOrderCode: `%${onlineOrderCode}%`,
          },
        );
      }

      // 内部单号
      if (oriInnerOrderCode) {
        queryBuilder = queryBuilder.andWhere(
          'order.ori_inner_order_code LIKE :oriInnerOrderCode',
          {
            oriInnerOrderCode: `%${oriInnerOrderCode}%`,
          },
        );
      }

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'order.customer_name LIKE :customerName',
          {
            customerName: `%${customerName}%`,
          },
        );
      }

      // 订单编号
      if (orderCode) {
        queryBuilder = queryBuilder.andWhere(
          'order.order_code LIKE :orderCode',
          {
            orderCode: `%${orderCode}%`,
          },
        );
      }

      // 订单状态
      if (orderStatus) {
        queryBuilder = queryBuilder.andWhere(
          'order.order_status = :orderStatus',
          {
            orderStatus,
          },
        );
      }

      // 时间范围查询
      if (startTime || endTime) {
        const timeRange = TimeFormatterUtil.getTimeRange(startTime, endTime);

        if (startTime && endTime) {
          // 时间范围查询：开始时间 <= created_time <= 结束时间
          queryBuilder = queryBuilder.andWhere(
            'order.created_time BETWEEN :startTime AND :endTime',
            {
              startTime: timeRange.start,
              endTime: timeRange.end,
            },
          );
        } else if (startTime) {
          // 只查询开始时间之后的数据：created_time >= 开始时间
          queryBuilder = queryBuilder.andWhere(
            'order.created_time >= :startTime',
            {
              startTime: timeRange.start,
            },
          );
        } else if (endTime) {
          // 只查询结束时间之前的数据：created_time <= 结束时间
          queryBuilder = queryBuilder.andWhere(
            'order.created_time <= :endTime',
            {
              endTime: timeRange.end,
            },
          );
        }
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('order.created_time', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取订单列表失败' + error.message);
    }
  }

  /**
   * 获取待审核订单列表
   */
  async getUnReviewOrderList(
    params: QueryOrderDto,
  ): Promise<{ items: OrderInfoResponseDto[]; total: number }> {
    try {
      const {
        customerName,
        orderCode,
        orderStatus,
        startTime,
        endTime,
        page,
        pageSize,
      } = params;

      // 差一个审核原因(连表查询)
      let queryBuilder = this.orderRepository
        .createQueryBuilder('order')
        .select([
          'order.id as id',
          'order.order_code as orderCode',
          'order.customer_id as customerId',
          'order.customer_name as customerName',
          'order.order_status as orderStatus',
          'order.amount as amount',
          'order.replenish_amount as replenishAmount',
          'order.auxiliary_sales_amount as auxiliarySalesAmount',
          'order.contact as contact',
          'order.contact_phone as contactPhone',
          'order.created_time as createdTime',
        ])
        .where('order.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .andWhere('order.order_status LIKE :orderStatus', {
          orderStatus: '20001%',
        });

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'order.customer_name LIKE :customerName',
          {
            customerName: `%${customerName}%`,
          },
        );
      }

      // 订单编号
      if (orderCode) {
        queryBuilder = queryBuilder.andWhere(
          'order.order_code LIKE :orderCode',
          {
            orderCode: `%${orderCode}%`,
          },
        );
      }

      // 订单状态
      if (orderStatus) {
        queryBuilder = queryBuilder.andWhere(
          'order.order_status = :orderStatus',
          {
            orderStatus,
          },
        );
      }

      // 时间范围查询
      if (startTime || endTime) {
        const timeRange = TimeFormatterUtil.getTimeRange(startTime, endTime);

        if (startTime && endTime) {
          // 时间范围查询：开始时间 <= created_time <= 结束时间
          queryBuilder = queryBuilder.andWhere(
            'order.created_time BETWEEN :startTime AND :endTime',
            {
              startTime: timeRange.start,
              endTime: timeRange.end,
            },
          );
        } else if (startTime) {
          // 只查询开始时间之后的数据：created_time >= 开始时间
          queryBuilder = queryBuilder.andWhere(
            'order.created_time >= :startTime',
            {
              startTime: timeRange.start,
            },
          );
        } else if (endTime) {
          // 只查询结束时间之前的数据：created_time <= 结束时间
          queryBuilder = queryBuilder.andWhere(
            'order.created_time <= :endTime',
            {
              endTime: timeRange.end,
            },
          );
        }
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('order.created_time', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取待审核订单列表失败' + error.message);
    }
  }

  /**
   * 检查订单金额
   * @param req - 检查订单金额请求参数
   * @returns 检查订单金额响应结果的Promise
   */
  async checkOrderAmount(
    req: CheckOrderAmountRequest,
  ): Promise<CheckOrderAmountResponse> {
    const response = new CheckOrderAmountResponse();
    const customerInfo = await this.customerService.getCustomerBaseInfoById(
      req.customerId,
    );
    if (!customerInfo) {
      throw new BusinessException('客户不存在');
    }
    response.customerName = customerInfo.customerName;
    response.customerId = customerInfo.id;
    // 计算订单金额 = 商品数量 * 出厂价相加
    const orderAmount = await this.calculateAmountWithQuery(req.finishGoods);
    // 订单金额
    response.orderAmount = parseString(orderAmount);

    // 额度计算订单总额
    const subsidyAmount = await this.calculateAmountWithQuery(
      req.finishGoods,
      true,
    );
    response.orderSubsidyAmount = parseString(subsidyAmount);

    // 计算使用货补金额及比例
    if (req.replenishGoods != null && req.replenishGoods.length > 0) {
      const replenishAmount = await this.calculateAmountWithQuery(
        req.replenishGoods,
      );
      response.replenishAmount = parseString(replenishAmount);
      response.replenishRatio = (replenishAmount / subsidyAmount).toFixed(4);
    }
    // 3. 计算辅销商品金额及比例；
    if (req.auxiliaryGoods != null && req.auxiliaryGoods.length > 0) {
      const auxiliaryAmount = await this.calculateAmountWithQuery(
        req.auxiliaryGoods,
      );
      response.auxiliarySalesAmount = parseString(auxiliaryAmount);
      response.auxiliarySalesRatio = (auxiliaryAmount / subsidyAmount).toFixed(
        4,
      );
    }
    // 4. 返回校验信息
    const messages: string[] = [];
    if (
      response.replenishRatio &&
      parseFloat(response.replenishRatio) >= 0.05
    ) {
      messages.push('当前货补使用比例为：' + response.replenishRatio);
    }
    if (
      response.auxiliarySalesRatio &&
      parseFloat(response.auxiliarySalesRatio) >= 0.003
    ) {
      messages.push('当前辅销使用比例为：' + response.auxiliarySalesRatio);
    }
    if (messages.length > 0) {
      response.message = messages.join('，') + '即将进入审批流程';
    }
    return response;
  }

  async add(
    req: AddOfflineOrderRequest,
    user: JwtUserPayload,
  ): Promise<string> {
    // 订单ID生成
    const orderId = IdUtil.generateId();
    // 包装客户基本信息
    const customerInfo = await this.customerService.getCustomerInfoById(req.customerId);
    if (!customerInfo) {
      throw new BusinessException('客户信息不存在！');
    }
    const orderMain = new OrderMainEntity();
    orderMain.id = orderId;
    orderMain.customerId = customerInfo.id;
    orderMain.customerName = customerInfo.customerName;
    orderMain.customerJstId = customerInfo.customerJstId;
    orderMain.regionalHeadId = customerInfo.regionalHeadId;
    orderMain.regionalHeadName = customerInfo.regionalHead;
    orderMain.provincialHeadId = customerInfo.provincialHeadId;
    orderMain.provincialHeadName = customerInfo.provincialHead;
    // 下单人联系人基本信息
    orderMain.contact = req.contact;
    orderMain.contactPhone = req.contactPhone;
    // 收货人联系信息
    const receiverAddress = req.receiverAddress;
    orderMain.receiverProvince = receiverAddress.receiverProvince;
    orderMain.receiverCity = receiverAddress.receiverCity;
    orderMain.receiverDistrict = receiverAddress.receiverDistrict;
    orderMain.receiverAddress = receiverAddress.receiverAddress;
    orderMain.reviserName = receiverAddress.receiverName;
    orderMain.receiverPhone = receiverAddress.receiverPhone;
    const orderItemList: OrderItemEntity[] = [];
    const commodityIds: string[] = [];
    commodityIds.push(...req.finishGoods.map(finish => finish.commodityId));
    commodityIds.push(...req.replenishGoods.map(replenish => replenish.commodityId));
    commodityIds.push(...req.auxiliaryGoods.map(auxiliary => auxiliary.commodityId));
    const commodityInfos =
      await this.commodityService.getCommodityListByCommodityIds(commodityIds);
    const commodityPriceMap = new Map<string, CommodityInfoEntity>();
    commodityInfos.forEach(good => {
      commodityPriceMap.set(good.id, good);
    });
    // 成品商品信息
    if (!req.finishGoods || req.finishGoods.length === 0) {
      throw new BusinessException('下单必须选择成品商品！');
    }
    const finishGoodList = req.finishGoods;
    finishGoodList.forEach(finish => {
      const { orderItem, commodityInfo, amount } = this.buildOrderItem(orderId, finish, commodityPriceMap, user);
      orderItem.isQuotaInvolved = commodityInfo.isQuotaInvolved;
      orderItem.replenishAmount = commodityInfo.isQuotaInvolved ? (amount * 0.1).toFixed(2) : null;
      orderItem.auxiliarySalesAmount = commodityInfo.isQuotaInvolved ? (amount * 0.03).toFixed(2) : null;
      orderItemList.push(orderItem);
    });
    // 货补商品信息
    if (req.replenishGoods){
      req.replenishGoods.forEach(item => {
        const { orderItem, commodityInfo, amount } = this.buildOrderItem(orderId, item, commodityPriceMap, user);
        orderItem.isQuotaInvolved = commodityInfo.isQuotaInvolved;
        orderItem.replenishAmount = orderItem.amount;
        orderItemList.push(orderItem);
      });
    }
    // 辅销商品信息
    if (req.auxiliaryGoods){
      req.auxiliaryGoods.forEach(item => {
        const { orderItem, commodityInfo, amount } = this.buildOrderItem(orderId, item, commodityPriceMap, user);
        orderItem.isQuotaInvolved = commodityInfo.isQuotaInvolved;
        orderItem.auxiliarySalesAmount = orderItem.amount;
        orderItemList.push(orderItem);
      })
    }
    this.orderRepository.save(orderMain);
    this.orderItemRepository.save(orderItemList);
    // 写入操作日志
    return orderId;
  }

  private buildOrderItem(orderId: string, finish: OrderItem, commodityPriceMap: Map<string, CommodityInfoEntity>, user: JwtUserPayload) {
    const orderItem = new OrderItemEntity();
    orderItem.id = IdUtil.generateId();
    orderItem.orderId = orderId;
    orderItem.type = OrderItemTypeEnum.FINISHED_PRODUCT;
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

    orderItem.boxQty = finish.boxQty;
    orderItem.qty = finish.qty;
    const amount = finish.qty * parseFloat(commodityInfo.itemExFactoryPrice);
    orderItem.amount = amount.toFixed(2);
    orderItem.deleted = GlobalStatusEnum.NO;
    orderItem.creatorId = user.userId;
    orderItem.creatorName = user.username;
    orderItem.createdTime = dayjs().toDate();
    orderItem.reviserId = user.userId;
    orderItem.reviserName = user.username;
    orderItem.revisedTime = dayjs().toDate();
    return { orderItem, commodityInfo, amount };
  }

  async update(
    req: UpdateOfflineOrderRequest,
    user: JwtUserPayload,
  ): Promise<string> {
    return 'orderId';
  }

  async cancel(req: CancelOrderRequest, user: JwtUserPayload): Promise<string> {
    return req.orderId;
  }

  async getOrderDetail(orderId: string): Promise<OrderDetailResponseDto> {
    this.logger.log(`Fetching order detail for orderId: ${orderId}`);
    // 查询订单主表信息、订单明细项信息, 操作日志在另一个接口中查询
    // 先查询订单主表信息，如果没有数据则返回异常
    const orderMain = await this.orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });

    if (!orderMain) {
      this.logger.warn(`Order not found for orderId: ${orderId}`);
      throw new BusinessException('订单不存在或已被删除');
    }

    this.logger.debug(`Order main found: ${JSON.stringify(orderMain)}`);

    // 查询订单明细项信息
    const orderItems = await this.orderItemRepository.find({
      where: { orderId: orderId, deleted: GlobalStatusEnum.NO },
      order: { type: 'ASC', id: 'ASC', createdTime: 'ASC' },
    });

    // 组装并返回订单详情数据
    const orderDetail: OrderDetailResponseDto = {
      id: orderMain.id,
      orderCode: orderMain.orderCode,
      onlineOrderCode: orderMain.onlineOrderCode,
      oriInnerOrderCode: orderMain.oriInnerOrderCode,
      orderStatus: orderMain.orderStatus,
      cancelledMessage: orderMain.cancelledMessage,
      auditTime: orderMain.auditTime?.toISOString() || null,
      pushTime: orderMain.pushTime?.toISOString() || null,
      deliveryTime: orderMain.deliveryTime?.toISOString() || null,
      customerId: orderMain.customerId,
      customerName: orderMain.customerName,
      regionalHeadId: orderMain.regionalHeadId,
      regionalHeadName: orderMain.regionalHeadName,
      provincialHeadId: orderMain.provincialHeadId,
      provincialHeadName: orderMain.provincialHeadName,
      contact: orderMain.contact,
      contactPhone: orderMain.contactPhone,
      receiverProvince: orderMain.receiverProvince,
      receiverCity: orderMain.receiverCity,
      receiverDistrict: orderMain.receiverDistrict,
      receiverAddress: orderMain.receiverAddress,
      receiverName: orderMain.receiverName,
      receiverPhone: orderMain.receiverPhone,
      remark: orderMain.remark,
      amount: orderMain.amount ?? '0',
      replenishAmount: orderMain.replenishAmount ?? '0',
      auxiliarySalesAmount: orderMain.auxiliarySalesAmount ?? '0',
      usedReplenishAmount: orderMain.usedReplenishAmount ?? '0',
      usedReplenishRatio: orderMain.usedReplenishRatio ?? '0',
      usedAuxiliarySalesAmount: orderMain.usedAuxiliarySalesAmount ?? '0',
      usedAuxiliarySalesRatio: orderMain.usedAuxiliarySalesRatio ?? '0',
      finishGoods: [],
      replenishGoods: [],
      auxiliaryGoods: [],
    };

    //按照 type 装入不同的商品类型数组
    for (const item of orderItems) {
      const goodsItem = {
        id: item.id,
        type: item.type,
        name: item.name,
        alias: item.aliasName,
        internalCode: item.internalCode,
        specInfo: item.specInfo,
        boxSpecInfo: item.boxSpecInfo,
        boxSpecPiece: item.boxSpecPiece,
        boxQty: item.boxQty,
        qty: item.qty,
        exFactoryPrice: item.exFactoryPrice ?? '0',
        isQuotaInvolved: item.isQuotaInvolved,
        amount: item.amount ?? '0',
        replenishAmount: item.replenishAmount ?? '0',
        auxiliarySalesAmount: item.auxiliarySalesAmount ?? '0',
      };

      switch (item.type) {
        case 'FINISH_GOODS':
          orderDetail.finishGoods.push(goodsItem);
          break;
        case 'REPLENISH_GOODS':
          orderDetail.replenishGoods.push(goodsItem);
          break;
        case 'AUXILIARY_GOODS':
          orderDetail.auxiliaryGoods.push(goodsItem);
          break;
        default:
          this.logger.warn(
            `Unknown item type '${item.type}' for order item ID: ${item.id}`,
          );
      }
    }

    return orderDetail;
  }

  /**
   * 查询商品并计算总金额
   * @param goods 商品列表
   * @param onlySubsidyInvolved
   * @returns 计算后的总金额
   */
  private async calculateAmountWithQuery(
    goods: OrderItem[],
    onlySubsidyInvolved = false,
  ): Promise<number> {
    const commodityIds = goods.map((item) => item.commodityId);
    const commodityInfos =
      await this.commodityService.getCommodityListByCommodityIds(commodityIds);
    return this.calculateTotalAmount(
      goods,
      commodityInfos,
      onlySubsidyInvolved,
    );
  }

  /**
   * 根据商品列表计算总金额
   * @param goods 商品列表
   * @param commodityInfos 商品信息列表
   * @param onlySubsidyInvolved
   * @returns 计算后的总金额
   */
  private calculateTotalAmount(
    goods: OrderItem[],
    commodityInfos: CommodityInfoEntity[],
    onlySubsidyInvolved = false,
  ): number {
    // 创建商品ID到出厂价的映射
    const commodityPriceMap = new Map<string, number>();
    let filteredCommodities = commodityInfos;
    if (onlySubsidyInvolved) {
      filteredCommodities = commodityInfos.filter(
        (commodity) =>
          commodity.isSupplySubsidyInvolved == BooleanStatusEnum.TRUE,
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
