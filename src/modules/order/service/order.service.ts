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
import { DataSource, In, Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { OrderMainEntity } from '../entities/order.main.entity';
import { OrderItemEntity } from '../entities/order.item.entity';
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CustomerService } from '@modules/customer/services/customer.service';
import { IdUtil } from '@src/utils';
import { OrderItemTypeEnum } from '@src/enums/order-item-type.enum';
import * as dayjs from 'dayjs';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { OrderConvertHelper } from '@modules/order/helper/order.convert.helper';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { OrderLogHelper } from '@modules/order/helper/order.log.helper';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { CustomerCreditLimitDetailService } from '@modules/customer/services/customer-credit-limit-detail.service';
import { CreditLimitDetailRequestDto } from '@src/dto';
import { OrderCheckService } from '@src/modules/order/service/order-check.service';
import { UserService } from '@modules/common/user/user.service';

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
    private businessLogService: BusinessLogService,
    private orderCheckService: OrderCheckService,
    private userService: UserService,
    private creditLimitDetailService: CustomerCreditLimitDetailService,
    private dataSource: DataSource, // 添加数据源注入
  ) {}

  /**
   * 获取订单列表
   */
  async getOrderList(
    params: QueryOrderDto,
    user: JwtUserPayload,
    token: string,
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

      const checkResult = await this.userService.getRangeOfOrderQueryUser(
        token,
        user.userId,
      );
      if (checkResult) {
        if (checkResult.isQueryAll == false) {
          queryBuilder = queryBuilder.andWhere(
            'order.creator_id IN (:userIds)',
            {
              userIds: checkResult.principalUserIds,
            },
          );
        }
      }
      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('order.created_time', 'DESC')
        .orderBy('order.id', 'DESC')
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
        .orderBy('order.id', 'DESC')
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
    response.orderAmount = String(orderAmount);

    // 额度计算订单总额
    const subsidyAmount = await this.calculateAmountWithQuery(
      req.finishGoods,
      true,
    );
    response.orderSubsidyAmount = String(subsidyAmount);

    // 计算使用货补金额及比例
    if (req.replenishGoods != null && req.replenishGoods.length > 0) {
      const replenishAmount = await this.calculateAmountWithQuery(
        req.replenishGoods,
      );
      response.replenishAmount = String(replenishAmount);
      response.replenishRatio = (replenishAmount / subsidyAmount).toFixed(4);
    }
    // 3. 计算辅销商品金额及比例；
    if (req.auxiliaryGoods != null && req.auxiliaryGoods.length > 0) {
      const auxiliaryAmount = await this.calculateAmountWithQuery(
        req.auxiliaryGoods,
      );
      response.auxiliarySalesAmount = String(auxiliaryAmount);
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
      messages.push(
        '当前货补使用比例为：' +
          (parseFloat(response.replenishRatio) * 100).toFixed(2) +
          '%',
      );
    }
    if (
      response.auxiliarySalesRatio &&
      parseFloat(response.auxiliarySalesRatio) >= 0.003
    ) {
      messages.push(
        '当前辅销使用比例为：' +
          (parseFloat(response.auxiliarySalesRatio) * 100).toFixed(2) +
          '%',
      );
    }
    if (messages.length > 0) {
      response.message = messages.join('，') + '即将进入审批流程';
    }
    return response;
  }

  /**
   * 添加一个线下订单。
   *
   * @param req - 创建订单的请求参数，包含客户、商品及收货信息等
   * @param user - 当前操作用户的身份信息（JWT解析后的数据）
   * @returns 返回新创建订单的唯一标识符（orderId）
   */
  async add(
    req: AddOfflineOrderRequest,
    user: JwtUserPayload,
  ): Promise<string> {
    // 订单ID生成
    const orderId = IdUtil.generateId();
    // 订单编码
    const orderCode = IdUtil.generateOrderCode();
    const lastOperateProgram = 'OrderService.add';
    this.logger.log(
      `开始创建订单，orderId: ${orderId}, customerId: ${req.customerId}`,
    );
    // 包装客户基本信息
    const customerInfo = await this.customerService.getCustomerBaseInfoById(
      req.customerId,
    );
    if (!customerInfo) {
      this.logger.warn(`客户信息不存在，customerId: ${req.customerId}`);
      throw new BusinessException('客户信息不存在！');
    }
    // 成品商品信息
    if (!req.finishGoods || req.finishGoods.length === 0) {
      throw new BusinessException('下单必须选择成品商品！');
    }
    const orderMain = new OrderMainEntity();
    orderMain.id = orderId;
    orderMain.orderCode = orderCode;
    OrderConvertHelper.convertCustomerInfo(orderMain, customerInfo);
    // 下单人联系人基本信息
    orderMain.contact = req.contact;
    orderMain.contactPhone = req.contactPhone;
    // 收货人联系信息
    OrderConvertHelper.convertReceiverAddressInfo(
      orderMain,
      req.receiverAddress,
    );

    const finishGoodsList = req.finishGoods;
    const replenishGoodsList = req.replenishGoods;
    const auxiliaryGoodsList = req.auxiliaryGoods;

    const { commodityInfos, commodityPriceMap } =
      await this.getCommodityMapByOrderItems(
        finishGoodsList,
        replenishGoodsList,
        auxiliaryGoodsList,
      );
    const finalOrderItemList: OrderItemEntity[] = [
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        finishGoodsList,
        commodityPriceMap,
        user,
        OrderItemTypeEnum.FINISHED_PRODUCT,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        replenishGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.REPLENISH_PRODUCT,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        auxiliaryGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT,
        lastOperateProgram,
      ),
    ];
    // 统计完商品后计算金额信息
    const orderAmount = OrderConvertHelper.calculateTotalAmount(
      req.finishGoods,
      commodityInfos,
    );
    orderMain.amount = String(orderAmount);

    const creditAmount = OrderConvertHelper.calculateTotalAmount(
      req.finishGoods,
      commodityInfos,
      true,
    );
    orderMain.creditAmount = String(creditAmount);

    OrderConvertHelper.convertOrderAmount(
      finalOrderItemList,
      orderMain,
      creditAmount,
      finishGoodsList,
      replenishGoodsList,
      auxiliaryGoodsList,
    );
    // 订单基础信息
    orderMain.creatorId = user.userId;
    orderMain.creatorName = user.nickName;
    orderMain.createdTime = dayjs().toDate();
    orderMain.reviserId = user.userId;
    orderMain.reviserName = user.nickName;
    orderMain.revisedTime = dayjs().toDate();
    orderMain.lastOperateProgram = lastOperateProgram;

    // todo 计算额度使用情况后，结合客户信息计算订单初始状态
    orderMain.orderStatus = String(OrderStatusEnum.PENDING_PAYMENT.valueOf());
    try {
      await this.dataSource.transaction(async (manager) => {
        this.logger.log(`开始事务处理，orderId: ${orderId}`);
        await Promise.all([
          manager.save(orderMain),
          manager.save(finalOrderItemList),
        ]);
      });
      // 写入操作日志
      const logInput = OrderLogHelper.getOrderOperate(
        user,
        OrderOperateTemplateEnum.CREATE_ORDER,
        lastOperateProgram,
        orderId,
      );
      logInput.params = req;
      await this.businessLogService.writeLog(logInput);
      // 锁定额度
      const creditDetail = this.buildCreditDetailParam(orderId, orderMain);
      // todo 验证完成后再解开注释
      await this.creditLimitDetailService.addCustomerOrderCredit(
        creditDetail,
        user,
      );
      return orderId;
    } catch (error) {
      this.logger.error(
        `创建订单失败，orderId: ${orderId}, error: ${error.message}`,
        error.stack,
      );
      this.logger.log(error);
      throw new BusinessException('创建失败，请查看日志！');
    }
  }

  private buildCreditDetailParam(orderId: string, orderMain: OrderMainEntity) {
    const creditDetail = new CreditLimitDetailRequestDto();
    creditDetail.orderId = orderId;
    creditDetail.customerId = orderMain.customerId;
    creditDetail.shippedAmount = orderMain.amount;
    creditDetail.auxiliarySaleGoodsAmount = orderMain.auxiliarySalesAmount;
    creditDetail.replenishingGoodsAmount = orderMain.replenishAmount;
    creditDetail.usedAuxiliarySaleGoodsAmount =
      orderMain.usedAuxiliarySalesAmount;
    creditDetail.usedReplenishingGoodsAmount = orderMain.usedReplenishAmount;
    return creditDetail;
  }

  async update(
    req: UpdateOfflineOrderRequest,
    user: JwtUserPayload,
  ): Promise<string> {
    const lastOperateProgram = 'OrderService.update';
    const orderId = req.orderId;
    // 判断是否存在订单
    const orderMain = await this.orderRepository.findOne({
      where: { id: req.orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) {
      throw new BusinessException('订单不存在或已被删除');
    }
    const updateOrderMain = new OrderMainEntity();
    updateOrderMain.id = orderMain.id;
    updateOrderMain.customerId = orderMain.customerId;
    // 仅允许非客户部份的信息
    // 1. 订单下单联系人
    updateOrderMain.contact = req.contact;
    updateOrderMain.contactPhone = req.contactPhone;
    // 2. 收货人信息
    OrderConvertHelper.convertReceiverAddressInfo(
      updateOrderMain,
      req.receiverAddress,
    );
    updateOrderMain.remark = req.remark.trim();
    // 3. 订单商品信息
    const finishGoodsList = req.finishGoods;
    const replenishGoodsList = req.replenishGoods;
    const auxiliaryGoodsList = req.auxiliaryGoods;
    const { commodityInfos, commodityPriceMap } =
      await this.getCommodityMapByOrderItems(
        finishGoodsList,
        replenishGoodsList,
        auxiliaryGoodsList,
      );
    const finalOrderItemList: OrderItemEntity[] = [
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        finishGoodsList,
        commodityPriceMap,
        user,
        OrderItemTypeEnum.FINISHED_PRODUCT,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        replenishGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.REPLENISH_PRODUCT,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        auxiliaryGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT,
        lastOperateProgram,
      ),
    ];

    // 开始计算订单金额

    // 统计完商品后计算金额信息
    const orderAmount = OrderConvertHelper.calculateTotalAmount(
      finishGoodsList,
      commodityInfos,
    );
    updateOrderMain.amount = String(orderAmount);

    const creditAmount = OrderConvertHelper.calculateTotalAmount(
      req.finishGoods,
      commodityInfos,
      true,
    );
    updateOrderMain.creditAmount = String(creditAmount);
    OrderConvertHelper.convertOrderAmount(
      finalOrderItemList,
      updateOrderMain,
      creditAmount,
      finishGoodsList,
      replenishGoodsList,
      auxiliaryGoodsList,
    );

    await this.dataSource.transaction(async (manage) => {
      // 修改订单
      await manage.save(updateOrderMain);
      // 保存最新数据
      await manage.save(finalOrderItemList);
      // 2. 取出库中旧明细（事务内读，避免幻读）
      const oldItems = await manage.findBy(OrderItemEntity, {
        orderId,
        deleted: GlobalStatusEnum.NO,
      });

      // 3. 计算被删的 ID
      const deletedIds = this.getDeletedOrderItems(
        oldItems,
        finalOrderItemList,
      );

      // 4. 软删除（批量）
      if (deletedIds.length) {
        await manage.update(
          OrderItemEntity,
          { id: In(deletedIds) },
          { deleted: GlobalStatusEnum.YES },
        );
      }
    });
    // 若金额有变化则需要释放额度后冻结额度
    if (
      orderMain.amount !== updateOrderMain.amount ||
      orderMain.creditAmount !== updateOrderMain.creditAmount ||
      orderMain.usedReplenishAmount !== updateOrderMain.usedReplenishAmount ||
      orderMain.usedAuxiliarySalesAmount !==
        updateOrderMain.usedAuxiliarySalesAmount
    ) {
      // todo 测试完再注释
      await this.creditLimitDetailService.editCustomerOrderCredit(
        this.buildCreditDetailParam(orderId, updateOrderMain),
        user,
      );
    }

    // 写入操作日志
    const logInput = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.UPDATE_ORDER,
      lastOperateProgram,
      orderId,
    );
    logInput.params(JSON.stringify(req));
    this.businessLogService.writeLog(logInput);
    // todo 确认审批流程

    return updateOrderMain.id;
  }

  /**
   * 取消订单
   * @param req - 取消订单请求参数，包含订单ID和取消原因
   * @param user - JWT用户信息，用于记录操作日志
   * @returns 返回被取消的订单ID
   */
  async cancel(req: CancelOrderRequest, user: JwtUserPayload): Promise<string> {
    const lastOperateProgram = 'OrderService.cancel';
    const orderMain = await this.orderRepository.findOne({
      where: { id: req.orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) {
      throw new BusinessException('订单不存在或已被删除');
    }
    const updateOrder = new OrderMainEntity();
    updateOrder.id = req.orderId;
    updateOrder.cancelledMessage = req.cancelReason;
    updateOrder.orderStatus = String(OrderStatusEnum.CLOSED);
    updateOrder.reviserId = user.userId;
    updateOrder.reviserName = user.nickName;
    updateOrder.revisedTime = dayjs().toDate();
    // 关闭订单
    // todo 关闭订单流水 测试完再打开
    await this.creditLimitDetailService.closeCustomerOrderCredit(
      orderMain.id,
      user,
    );

    await this.orderRepository.update({ id: updateOrder.id }, updateOrder);

    const result = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.CANCEL_ORDER,
      lastOperateProgram,
      req.orderId,
    );
    if (req.cancelReason !== undefined) {
      result.action = result.action + ';取消原因为:' + req.cancelReason;
    }
    this.businessLogService.writeLog(result);
    return req.orderId;
  }

  /**
   * 确认订单回款
   * @param orderId 订单ID
   * @param user 当前操作用户信息
   * @returns 返回订单ID
   */
  async confirmPayment(orderId: string, user: JwtUserPayload) {
    const lastOperateProgram = 'OrderService.confirmPayment';
    const orderMain = await this.orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) {
      throw new BusinessException('订单不存在或已被删除');
    }
    const updateOrder = new OrderMainEntity();
    updateOrder.id = orderId;
    updateOrder.orderStatus = String(OrderStatusEnum.PENDING_PUSH);
    // 修改订单信息
    await this.orderRepository.update({ id: orderMain.id }, updateOrder);
    // 释放额度
    await this.creditLimitDetailService.confirmCustomerOrderCredit(
      orderId,
      user,
    );
    const result = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.CONFIRM_ORDER_PAYMENT,
      lastOperateProgram,
      orderId,
    );
    this.businessLogService.writeLog(result);
    return orderId;
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
      region: orderMain.region,
      regionalHeadId: orderMain.regionalHeadId,
      regionalHeadName: orderMain.regionalHeadName,
      provincialHeadId: orderMain.provincialHeadId,
      provincialHeadName: orderMain.provincialHeadName,
      contact: orderMain.contact,
      contactPhone: orderMain.contactPhone,
      receiverAddress: {
        receiverProvince: orderMain.receiverProvince,
        receiverCity: orderMain.receiverCity,
        receiverDistrict: orderMain.receiverDistrict,
        receiverAddress: orderMain.receiverAddress,
        receiverName: orderMain.receiverName,
        receiverPhone: orderMain.receiverPhone,
      },
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
        commodityId: item.commodityId, // 商品ID
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
        case OrderItemTypeEnum.FINISHED_PRODUCT:
          orderDetail.finishGoods.push(goodsItem);
          break;
        case OrderItemTypeEnum.REPLENISH_PRODUCT:
          orderDetail.replenishGoods.push(goodsItem);
          break;
        case OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT:
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
    return OrderConvertHelper.calculateTotalAmount(
      goods,
      commodityInfos,
      onlySubsidyInvolved,
    );
  }

  /**
   * 根据订单项获取商品信息映射
   * @param finishGoods 完整商品订单项列表
   * @param replenishGoods 补货商品订单项列表
   * @param auxiliaryGoods 辅助商品订单项列表
   * @returns 包含商品信息列表和商品价格映射的Promise对象
   */
  private async getCommodityMapByOrderItems(
    finishGoods: OrderItem[],
    replenishGoods: OrderItem[],
    auxiliaryGoods: OrderItem[],
  ) {
    const commodityIds: string[] = [];
    commodityIds.push(...finishGoods.map((finish) => finish.commodityId));
    if (replenishGoods && replenishGoods.length > 0) {
      commodityIds.push(
        ...replenishGoods.map((replenish) => replenish.commodityId),
      );
    }
    if (auxiliaryGoods && auxiliaryGoods.length > 0) {
      commodityIds.push(
        ...auxiliaryGoods.map((auxiliary) => auxiliary.commodityId),
      );
    }

    this.logger.log(`需要查询的商品ID列表: ${JSON.stringify(commodityIds)}`);
    const commodityInfos =
      await this.commodityService.getCommodityListByCommodityIds(commodityIds);

    const commodityPriceMap = new Map<string, CommodityInfoEntity>();
    commodityInfos.forEach((good) => {
      commodityPriceMap.set(good.id, good);
    });
    return { commodityInfos, commodityPriceMap };
  }

  /**
   * 检查订单项列表中的商品是否已被删除
   * @returns 被删除的订单项列表
   * @param oldItems
   * @param newItems
   */
  private getDeletedOrderItems(
    oldItems: OrderItemEntity[],
    newItems: OrderItemEntity[],
  ): string[] {
    const newIds = new Set(newItems.map((i) => i.id));
    return oldItems.filter((i) => i.id && !newIds.has(i.id)).map((i) => i.id);
  }
}
