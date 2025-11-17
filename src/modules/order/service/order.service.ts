import { Injectable, Logger } from '@nestjs/common';
import {
  AddOfflineOrderRequest,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  UpdateOfflineOrderRequest,
  QueryOrderDto,
  OrderInfoResponseDto,
  OrderDetailResponseDto,
} from '@src/dto/order/order.common.dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { OrderMainEntity } from '../entities/order.main.entity';
import { OrderItemEntity } from '../entities/order.item.entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  constructor(
    @InjectRepository(OrderMainEntity)
    private orderReposity: Repository<OrderMainEntity>,

    @InjectRepository(OrderItemEntity)
    private orderItemRepository: Repository<OrderItemEntity>,
  ) {}

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
        page,
        pageSize,
      } = params;

      let queryBuilder = this.orderReposity
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
      if (customerName) {
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
   * 检查订单金额
   * @param req - 检查订单金额请求参数
   * @returns 检查订单金额响应结果的Promise
   */
  async checkOrderAmount(
    req: CheckOrderAmountRequest,
  ): Promise<CheckOrderAmountResponse> {
    return null;
  }

  async add(
    req: AddOfflineOrderRequest,
    user: JwtUserPayload,
  ): Promise<string> {
    return 'orderId';
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
    const orderMain = await this.orderReposity.findOne({
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
      items: orderItems.map((item) => ({
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
      })),
    };
    return orderDetail;
  }
}
