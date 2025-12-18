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
  UpdateOrderRemarks,
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
import { IdUtil } from '@src/utils';
import { OrderItemTypeEnum } from '@src/enums/order-item-type.enum';
import * as dayjs from 'dayjs';
import {
  OrderStatusEnum,
  OrderStatusEnumText,
} from '@src/enums/order-status.enum';
import { OrderConvertHelper } from '@modules/order/helper/order.convert.helper';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { OrderLogHelper } from '@modules/order/helper/order.log.helper';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { CustomerCreditLimitDetailService } from '@modules/customer/services/customer-credit-limit-detail.service';
import { OrderCheckService } from '@src/modules/order/service/order-check.service';
import { UserService } from '@modules/common/user/user.service';
import { ApprovalEngineService } from '@modules/approval/services/approval-engine.service';
import { CancelApprovalDto } from '@src/dto';
import { CustomerService } from '@modules/customer/services/customer.service';
import { ApprovalConfig } from '@src/configs/approval.config';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderMainEntity)
    private orderRepository: Repository<OrderMainEntity>,
    @InjectRepository(OrderItemEntity)
    private orderItemRepository: Repository<OrderItemEntity>,
    private commodityService: CommodityService,
    private businessLogService: BusinessLogService,
    private orderCheckService: OrderCheckService,
    private approvalEngineService: ApprovalEngineService,
    private userService: UserService,
    private customerService: CustomerService,
    private creditLimitDetailService: CustomerCreditLimitDetailService,
    private dataSource: DataSource, // 添加数据源注入
    private approvalConfig: ApprovalConfig,
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
          'order.order_status LIKE :orderStatus',
          {
            orderStatus: `${orderStatus}%`,
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

      // 获取权限
      const checkResult = await this.userService.getRangeOfOrderQueryUser(
        token,
        user.userId,
      );
      if (!checkResult || checkResult.isQueryAll) {
        // 不限制客户范围，继续查询
      } else if (!checkResult.principalUserIds?.length) {
        return { items: [], total: 0 };
      } else {
        // 收集所有人负责的客户ID，去查询订单对应的客户ID
        const customerIds = await this.customerService.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return { items: [], total: 0 };
        }

        queryBuilder = queryBuilder.andWhere(
          'order.customer_id IN (:customerIds)',
          { customerIds },
        );
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('order.created_time', 'DESC')
        .addOrderBy('order.id', 'DESC')
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
    user: JwtUserPayload,
    token: string,
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
          'order.used_replenish_ratio as usedReplenishRatio',
          'order.used_auxiliary_sales_ratio as usedAuxiliarySalesRatio',
          'used_replenish_amount as usedReplenishAmount',
          'order.used_auxiliary_sales_amount as usedAuxiliarySalesAmount',
          'order.approval_reason as approvalReason',
          'order.approval_remark as approvalRemark',
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

      // 获取权限
      const checkResult = await this.userService.getRangeOfOrderQueryUser(
        token,
        user.userId,
      );
      if (!checkResult || checkResult.isQueryAll) {
        // 不限制客户范围，继续查询
      } else if (!checkResult.principalUserIds?.length) {
        this.logger.log('进入了else');
        return { items: [], total: 0 };
      } else {
        // 收集所有人负责的客户ID，去查询订单对应的客户ID
        const customerIds = await this.customerService.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return { items: [], total: 0 };
        }

        queryBuilder = queryBuilder.andWhere(
          'order.customer_id IN (:customerIds)',
          { customerIds },
        );
      }
      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('order.created_time', 'DESC')
        .addOrderBy('order.id', 'DESC')
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
    const customerInfo = await this.orderCheckService.checkCustomerInfo(
      req.customerId,
    );
    return await this.orderCheckService.calculateCheckAmountResult(
      customerInfo,
      req.finishGoods,
      req.replenishGoods,
      req.auxiliaryGoods,
    );
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
    // 客户基本信息
    const customerInfo = await this.orderCheckService.checkCustomerInfo(
      req.customerId,
    );

    // 订单ID生成
    const orderId = IdUtil.generateId();
    // 订单编码
    const orderCode = IdUtil.generateOrderCode();
    const lastOperateProgram = 'OrderService.add';
    this.logger.log(
      `开始创建订单，orderId: ${orderId}, customerId: ${req.customerId}`,
    );

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
    // 备注信息
    orderMain.remark = req.remark?.trim() ?? '';
    orderMain.orderTimeliness = req.orderTimeliness?.trim() ?? '';
    orderMain.processCodeRemark = req.processCodeRemark?.trim() ?? '';
    orderMain.deliveryRequirement = req.deliveryRequirement?.trim() ?? '';

    // 处理商品信息
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
        this.approvalConfig,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        replenishGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.REPLENISH_PRODUCT,
        this.approvalConfig,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        auxiliaryGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT,
        this.approvalConfig,
        lastOperateProgram,
      ),
    ];
    // 若包含组合产品，则需要将产品转换为组合的产品
    const bundledIds = commodityInfos
      .filter((c) => c.isBundledProducts > 0)
      .map((c) => c.id);
    if (bundledIds.length) {
      await this.calculateBundleCommodity(
        bundledIds,
        finalOrderItemList,
        commodityPriceMap,
        orderId,
        user,
        lastOperateProgram,
      );
    }

    const orderAmountResponse =
      await this.orderCheckService.calculateCheckAmountResult(
        customerInfo,
        finishGoodsList,
        replenishGoodsList,
        auxiliaryGoodsList,
      );

    OrderConvertHelper.convertOrderItemAmount(
      finalOrderItemList,
      orderMain,
      orderAmountResponse,
    );

    // 订单基础信息
    orderMain.creatorId = user.userId;
    orderMain.creatorName = user.nickName;
    orderMain.createdTime = dayjs().toDate();
    orderMain.reviserId = user.userId;
    orderMain.reviserName = user.nickName;
    orderMain.revisedTime = dayjs().toDate();
    orderMain.lastOperateProgram = lastOperateProgram;

    // 结合客户信息计算订单初始状态
    orderMain.orderStatus = await this.orderCheckService.calculateOrderStatus(
      orderAmountResponse,
      user,
      customerInfo,
    );
    this.logger.log(`计算后订单状态为：${orderMain.orderStatus}`);
    try {
      await this.dataSource.transaction(async (manager) => {
        await Promise.all([
          manager.save(orderMain),
          manager.save(finalOrderItemList),
        ]);
        // 锁定额度
        const creditDetail = OrderConvertHelper.buildCreditDetailParam(
          orderId,
          orderMain,
        );

        await this.creditLimitDetailService.addCustomerOrderCredit(
          creditDetail,
          user,
        );
        // 调用审批流程
        const approvalDto = OrderConvertHelper.buildApprovalDto(
          orderMain,
          user,
        );
        this.logger.log('approvalDto:', JSON.stringify(approvalDto));
        await this.approvalEngineService.startApprovalProcess(approvalDto);
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
      return orderId;
    } catch (error) {
      this.logger.error(
        `创建订单失败，orderId: ${orderId}, error: ${error.message}`,
        error.stack,
      );
      throw new BusinessException('创建失败，请查看日志！');
    }
  }

  /**
   * 更新线下订单信息
   *
   * @param req - 包含订单更新请求数据的对象，包括订单ID、联系人信息、收货地址、备注以及各类商品列表等
   * @param user - 当前操作用户的身份信息，用于权限控制和日志记录
   * @returns 返回更新后的订单ID
   */
  async update(
    req: UpdateOfflineOrderRequest,
    user: JwtUserPayload,
  ): Promise<string> {
    const lastOperateProgram = 'OrderService.update';
    const orderId = req.orderId;
    // 判断是否存在订单
    const orderMain = await this.orderCheckService.checkOrderExist(orderId);
    const updateOrderMain = new OrderMainEntity();
    updateOrderMain.id = orderMain.id;
    updateOrderMain.customerId = orderMain.customerId;
    updateOrderMain.creatorId = orderMain.creatorId;
    // 仅允许非客户部份的信息
    // 1. 订单下单联系人
    updateOrderMain.contact = req.contact;
    updateOrderMain.contactPhone = req.contactPhone;
    // 2. 收货人信息
    OrderConvertHelper.convertReceiverAddressInfo(
      updateOrderMain,
      req.receiverAddress,
    );
    updateOrderMain.regionalHeadId = orderMain.regionalHeadId;
    updateOrderMain.provincialHeadId = orderMain.provincialHeadId;
    // 备注信息
    updateOrderMain.remark = req.remark?.trim() ?? '';
    updateOrderMain.orderTimeliness = req.orderTimeliness?.trim() ?? '';
    updateOrderMain.processCodeRemark = req.processCodeRemark?.trim() ?? '';
    updateOrderMain.deliveryRequirement = req.deliveryRequirement?.trim() ?? '';

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
        this.approvalConfig,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        replenishGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.REPLENISH_PRODUCT,
        this.approvalConfig,
        lastOperateProgram,
      ),
      ...OrderConvertHelper.buildOrderItems(
        orderId,
        auxiliaryGoodsList || [],
        commodityPriceMap,
        user,
        OrderItemTypeEnum.AUXILIARY_SALES_PRODUCT,
        this.approvalConfig,
        lastOperateProgram,
      ),
    ];
    // 若包含组合产品，则需要将产品转换为组合的产品
    const bundledIds = commodityInfos
      .filter((c) => c.isBundledProducts > 0)
      .map((c) => c.id);
    if (bundledIds.length) {
      await this.calculateBundleCommodity(
        bundledIds,
        finalOrderItemList,
        commodityPriceMap,
        orderId,
        user,
        lastOperateProgram,
      );
    }

    // 开始计算订单金额
    const customerInfo = await this.orderCheckService.checkCustomerInfo(
      orderMain.customerId,
    );
    const calculateAmount =
      await this.orderCheckService.calculateCheckAmountResult(
        customerInfo,
        finishGoodsList,
        replenishGoodsList,
        auxiliaryGoodsList,
      );
    OrderConvertHelper.convertOrderItemAmount(
      finalOrderItemList,
      updateOrderMain,
      calculateAmount,
    );
    // 修改订单需要重新计算订单状态
    const orderStatus = await this.orderCheckService.calculateOrderStatus(
      calculateAmount,
      user,
      customerInfo,
    );
    this.logger.log('orderStatus:', orderStatus);
    if (orderMain.orderStatus !== orderStatus) {
      updateOrderMain.orderStatus = orderStatus;
      updateOrderMain.lastOperateProgram = lastOperateProgram;
    }
    await this.dataSource.transaction(async (manager) => {
      // 修改订单
      await manager.save(updateOrderMain);
      // 保存最新数据
      await manager.save(finalOrderItemList);
      // 2. 取出库中旧明细（事务内读，避免幻读）
      const oldItems = await manager.findBy(OrderItemEntity, {
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
        await manager.update(
          OrderItemEntity,
          { id: In(deletedIds) },
          { deleted: GlobalStatusEnum.YES },
        );
      }
      // 若金额有变化则需要释放额度后冻结额度
      if (
        this.isAmountChanged(orderMain.amount, updateOrderMain.amount) ||
        this.isAmountChanged(
          orderMain.creditAmount,
          updateOrderMain.creditAmount,
        ) ||
        this.isAmountChanged(
          orderMain.usedReplenishAmount,
          updateOrderMain.usedReplenishAmount,
        ) ||
        this.isAmountChanged(
          orderMain.usedAuxiliarySalesAmount,
          updateOrderMain.usedAuxiliarySalesAmount,
        )
      ) {
        this.logger.log('金额变更，即将进入更新客户额度变更流程');
        await this.creditLimitDetailService.editCustomerOrderCredit(
          OrderConvertHelper.buildCreditDetailParam(orderId, updateOrderMain),
          user,
          manager,
        );
      }

      // 调用审批流程
      const approvalDto = OrderConvertHelper.buildApprovalDto(
        updateOrderMain,
        user,
      );
      this.logger.log(`修改订单，审批信息为：${JSON.stringify(approvalDto)}`);
      await this.approvalEngineService.startApprovalProcess(approvalDto);
    });

    this.logger.log('开始写入日志：');

    // 写入操作日志
    const logInput = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.UPDATE_ORDER,
      lastOperateProgram,
      orderId,
    );
    logInput.params = req;
    await this.businessLogService.writeLog(logInput);
    return updateOrderMain.id;
  }

  /** 更新订单备注
   * @param req - 包含订单ID和新的备注信息的请求对象
   * @param user - 当前操作用户的身份信息
   * @returns 返回更新后的订单ID
   */
  async updateRemarks(
    req: UpdateOrderRemarks,
    user: JwtUserPayload,
  ): Promise<string> {
    const lastOperateProgram = 'OrderService.updateRemarks';
    const orderMain = await this.orderCheckService.checkOrderExist(req.orderId);

    // 用于整理待更新字段的本地对象，不参与 ORM 持久化
    const updateOrderMain: Partial<OrderMainEntity> = {
      id: req.orderId,
      remark: req.remark ?? orderMain.remark,
      orderTimeliness: req.orderTimeliness ?? orderMain.orderTimeliness,
      processCodeRemark: req.processCodeRemark ?? orderMain.processCodeRemark,
      deliveryRequirement:
        req.deliveryRequirement ?? orderMain.deliveryRequirement,
      lastOperateProgram,
      reviserId: user.userId,
      reviserName: user.nickName,
      revisedTime: dayjs().toDate(),
    };

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          OrderMainEntity,
          { id: req.orderId },
          {
            remark: updateOrderMain.remark,
            orderTimeliness: updateOrderMain.orderTimeliness,
            processCodeRemark: updateOrderMain.processCodeRemark,
            deliveryRequirement: updateOrderMain.deliveryRequirement,
            reviserId: updateOrderMain.reviserId,
            reviserName: updateOrderMain.reviserName,
            revisedTime: updateOrderMain.revisedTime,
            lastOperateProgram,
          },
        );

        const logInput = OrderLogHelper.getOrderOperate(
          user,
          OrderOperateTemplateEnum.UPDATE_ORDER_REMARKS,
          lastOperateProgram,
          req.orderId,
        );
        logInput.params = req;
        await this.businessLogService.writeLog(logInput, manager);
      });
    } catch (err) {
      this.logger.error(
        `更新订单备注异常，orderId: ${req.orderId}, error: ${err.message}`,
        err.stack,
        lastOperateProgram,
      );
      throw new BusinessException('更新订单备注异常！');
    }

    return updateOrderMain.id;
  }

  private async calculateBundleCommodity(
    bundledIds: string[],
    finalOrderItemList: OrderItemEntity[],
    commodityPriceMap: Map<string, CommodityInfoEntity>,
    orderId: string,
    user: JwtUserPayload,
    lastOperateProgram: string,
  ) {
    if (bundledIds.length === 0) {
      return;
    }
    const expanded = await this.expandBundledItems(
      bundledIds,
      finalOrderItemList,
      commodityPriceMap,
      orderId,
      user,
      lastOperateProgram,
    );
    const mergedExpanded = OrderConvertHelper.mergeOrderItems(expanded);

    // 剔除原组合商品，追加合并后的子商品
    finalOrderItemList.splice(
      0,
      finalOrderItemList.length,
      ...finalOrderItemList.filter(
        (item) => !bundledIds.includes(item.commodityId),
      ),
      ...mergedExpanded,
    );
    // 最后再做一次全局合并（可选，防止用户重复添加普通商品）
    finalOrderItemList.splice(
      0,
      finalOrderItemList.length,
      ...OrderConvertHelper.mergeOrderItems(finalOrderItemList),
    );
  }

  /**
   * 取消订单
   * @param req - 取消订单请求参数，包含订单ID和取消原因
   * @param user - JWT用户信息，用于记录操作日志
   * @returns 返回被取消的订单ID
   */
  async cancel(req: CancelOrderRequest, user: JwtUserPayload): Promise<string> {
    const lastOperateProgram = 'OrderService.cancel';
    const orderMain = await this.orderCheckService.checkOrderExist(req.orderId);
    const flag = await this.orderCheckService.checkIsCloseOrder(orderMain);
    if (!flag) {
      throw new BusinessException('当前订单不允许取消！');
    }

    const updateOrder = new OrderMainEntity();
    updateOrder.id = req.orderId;
    updateOrder.cancelledMessage = req.cancelReason;
    updateOrder.orderStatus = String(OrderStatusEnum.CLOSED);
    updateOrder.reviserId = user.userId;
    updateOrder.reviserName = user.nickName;
    updateOrder.revisedTime = dayjs().toDate();
    await this.dataSource.transaction(async (manager) => {
      // 关闭订单
      await this.creditLimitDetailService.closeCustomerOrderCredit(
        orderMain.id,
        user,
        false,
        manager,
      );
      // 修改订单
      await manager.update(OrderMainEntity, { id: orderMain.id }, updateOrder);
      // 调用审批流程
      const approvalDto = new CancelApprovalDto();
      approvalDto.orderId = orderMain.id;
      approvalDto.operatorId = user.userId;
      approvalDto.operatorName = user.nickName;
      approvalDto.reason = req.cancelReason ? req.cancelReason.trim() : '';
      await this.approvalEngineService.cancelApprovalProcess(approvalDto);
    });

    const result = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.CANCEL_ORDER,
      lastOperateProgram,
      req.orderId,
    );
    if (req.cancelReason !== undefined) {
      result.action = result.action + ';取消原因为:' + req.cancelReason;
    }
    await this.businessLogService.writeLog(result);
    return req.orderId;
  }

  /**
   * 订单推单释放额度
   * @param orderId 订单ID
   * @param user 当前操作用户信息
   * @param manual
   * @returns 返回订单ID
   */
  async confirmPayment(orderId: string, user: JwtUserPayload, manual = false) {
    // 手动调用的确认需要补充修改信息
    if (manual) {
      // 修改订单信息
      const orderMain = await this.orderCheckService.checkOrderExist(orderId);
      const updateOrder = new OrderMainEntity();
      updateOrder.id = orderId;
      updateOrder.reviserId = user.userId;
      updateOrder.receiverName = user.nickName;
      updateOrder.revisedTime = dayjs().toDate();
      await this.dataSource.manager.update(
        OrderMainEntity,
        { id: orderMain.id },
        updateOrder,
      );
    }
    // 释放额度
    await this.creditLimitDetailService.confirmCustomerOrderCredit(
      orderId,
      user,
    );
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
      orderTimeliness: orderMain.orderTimeliness,
      processCodeRemark: orderMain.processCodeRemark,
      deliveryRequirement: orderMain.deliveryRequirement,
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
      operateButtons: [],
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
        commodityBarcode: item.commodityBarcode,
        remark: item.remark,
        specInfo: item.specInfo,
        boxSpecInfo: item.boxSpecInfo,
        boxSpecPiece: item.boxSpecPiece,
        boxQty: item.boxQty,
        qty: item.qty,
        isUseBoxUnit: item.isUseBoxUnit > 0,
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
   * 把“组合商品”展开成子商品列表
   * @param bundledIds        所有组合商品 ID
   * @param sourceItems       订单行（含组合商品）
   * @param priceMap          商品价格缓存
   * @param orderId           当前订单号
   * @param user              当前用户
   * @param lastOperateProgram
   * @returns 展开后的子商品订单行（不包含原组合商品）
   */
  private async expandBundledItems(
    bundledIds: string[],
    sourceItems: OrderItemEntity[],
    priceMap: Map<string, CommodityInfoEntity>,
    orderId: string,
    user: JwtUserPayload,
    lastOperateProgram: string,
  ): Promise<OrderItemEntity[]> {
    // 并发查询所有组合明细
    const subCommodityIds = new Set<string>();
    const bundleList = await Promise.all(
      bundledIds.map((id) =>
        this.commodityService.getCommodityBundleIdListByCommodityId(id),
      ),
    );
    bundleList.flat().forEach((b) => subCommodityIds.add(b.bundledCommodityId));
    if (subCommodityIds.size) {
      const subCommodities =
        await this.commodityService.getCommodityListByCommodityIds([
          ...subCommodityIds,
        ]);
      subCommodities.forEach((c) => priceMap.set(c.id, c));
    }
    // 建立“组合商品ID -> 订单行”映射，方便后面取数量/类型
    const itemMap = new Map(
      sourceItems
        .filter((i) => bundledIds.includes(i.commodityId))
        .map((i) => [i.commodityId, i]),
    );
    // 建立“组合商品ID -> 子商品列表”映射
    const bundleMap = new Map<string, any[]>();
    bundleList.forEach((list, idx) => {
      const parentId = bundledIds[idx];
      bundleMap.set(parentId, list);
    });
    // 开始组装
    const result: OrderItemEntity[] = [];

    bundledIds.forEach((parentId) => {
      const parentItem = itemMap.get(parentId);
      if (!parentItem) return; // 理论上不会走到这里

      const children = bundleMap.get(parentId) ?? [];
      this.logger.log(
        `parentId=${parentId} 对应的子商品条数=${children.length}`,
      );

      children.forEach((bun) => {
        const info = priceMap.get(bun.bundledCommodityId);

        if (!info) return; // 数据异常直接跳过

        const entity = new OrderItemEntity();
        Object.assign(entity, {
          id: IdUtil.generateId(), // 新 ID
          orderId,
          commodityId: info.id,
          name: info.commodityName,
          aliasName: info.commodityAliaName,
          internalCode: info.commodityInternalCode,
          specInfo: info.itemSpecInfo,
          boxSpecPiece: info.boxSpecPiece,
          boxSpecInfo: info.boxSpecInfo,
          exFactoryPrice: info.itemExFactoryPrice,
          exFactoryBoxPrice: info.boxExFactoryPrice,
          isQuotaInvolved: info.isQuotaInvolved,
          boxQty: Number(parentItem.boxQty || 0),
          qty: Number(parentItem.qty || 0),
          amount: (
            Number(parentItem.qty || 0) * parseFloat(info.itemExFactoryPrice)
          ).toFixed(2),
          type: parentItem.type,
          lastOperateProgram: lastOperateProgram,
          deleted: GlobalStatusEnum.NO,
          creatorId: user.userId,
          creatorName: user.nickName,
          createdTime: dayjs().toDate(),
        });
        result.push(entity);
      });
    });
    this.logger.log(`result1111:${JSON.stringify(result)}`);
    return result;
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
  private isAmountChanged(oldValue: string, newValue: string): boolean {
    return (
      Math.abs(parseFloat(oldValue || '0') - parseFloat(newValue || '0')) >
      0.0001
    );
  }

  /**
   * 导出订单列表
   * @param query 查询参数
   * @param user
   * @param token
   * @returns 客户订单列表
   */
  async exportOrderList(
    params: QueryOrderDto,
    user: JwtUserPayload,
    token: string,
  ): Promise<OrderInfoResponseDto[]> {
    try {
      const {
        onlineOrderCode,
        oriInnerOrderCode,
        customerName,
        orderCode,
        orderStatus,
        startTime,
        endTime,
      } = params;

      let queryBuilder = this.orderRepository
        .createQueryBuilder('order')
        .select([
          // 订单基本信息
          'order.customer_name as customerName',
          'order.order_code as orderCode',
          'order.amount as amount',
          'order.created_time as createdTime',
          `CASE order.order_status 
             ${Object.entries(OrderStatusEnumText)
               .map(([key, value]) => `WHEN '${key}' THEN '${value}'`)
               .join(' ')}
           END as orderStatus`,

          // 商品信息
          'item.name as commodityName',
          'item.internal_code as internalCode',
          'item.commodity_barcode as commodityBarcode',
          'item.box_spec_piece as boxSpecPiece',
          'item.box_spec_info as boxSpecInfo',

          // 商品属性
          `CASE WHEN item.is_quota_involved = 1 THEN '是' ELSE '否' END as isQuotaInvolved`,
          `CASE 
                WHEN item.type = 'FINISHED_PRODUCT' THEN '成品商品'
                WHEN item.type = 'REPLENISH_PRODUCT' THEN '货补产品'
                WHEN item.type = 'AUXILIARY_SALES_PRODUCT' THEN '辅销产品'
              END as productType`,

          // 价格和数量信息
          'item.ex_factory_price as exFactoryPrice',
          'item.qty as quantity',
          'item.amount as itemAmount',

          // 货补金额计算
          `CASE 
                WHEN item.type = 'FINISHED_PRODUCT' THEN item.replenish_amount 
                ELSE '0' 
              END as generatedReplenishAmount`,
          `CASE 
                WHEN item.type = 'REPLENISH_PRODUCT' THEN item.replenish_amount 
                ELSE '0' 
              END as usedReplenishAmount`,

          // 辅销金额计算
          `CASE 
                WHEN item.type = 'FINISHED_PRODUCT' THEN item.auxiliary_sales_amount 
                ELSE '0' 
              END as generatedAuxiliarySalesAmount`,
          `CASE 
                WHEN item.type = 'AUXILIARY_SALES_PRODUCT' THEN item.auxiliary_sales_amount 
                ELSE '0' 
              END as usedAuxiliarySalesAmount`,

          // 备注信息
          'item.remark as itemRemark',
        ])
        .leftJoin('order_item', 'item', 'order.id = item.order_id')
        .where('item.deleted = :itemDeleted', {
          itemDeleted: GlobalStatusEnum.NO,
        })
        .andWhere('order.deleted = :deleted', {
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
          'order.order_status LIKE :orderStatus',
          {
            orderStatus: `${orderStatus}%`,
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

      // 获取权限
      const checkResult = await this.userService.getRangeOfOrderQueryUser(
        token,
        user.userId,
      );
      if (!checkResult || checkResult.isQueryAll) {
        // 不限制客户范围，继续查询
      } else if (!checkResult.principalUserIds?.length) {
        return [];
      } else {
        // 收集所有人负责的客户ID，去查询订单对应的客户ID
        const customerIds = await this.customerService.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return [];
        }

        queryBuilder = queryBuilder.andWhere(
          'order.customer_id IN (:customerIds)',
          { customerIds },
        );
      }

      queryBuilder = queryBuilder
        .orderBy('order.order_code', 'DESC')
        .addOrderBy('item.type', 'DESC');

      const items = await queryBuilder.getRawMany();

      return items;
    } catch (error) {
      throw new BusinessException('获取订单列表失败' + error.message);
    }
  }
}
