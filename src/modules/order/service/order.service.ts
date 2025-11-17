import { Injectable } from '@nestjs/common';
import {
  AddOfflineOrderRequest,
  CancelOrderRequest,
  CheckOrderAmountRequest,
  CheckOrderAmountResponse,
  UpdateOfflineOrderRequest,
  QueryOrderDto,
  OrderInfoResponseDto,
} from '@src/dto/order/order.common.dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { TimeFormatterUtil } from '@utils/time-formatter.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { OrderMainEntity } from '../entities/order.main.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderMainEntity)
    private orderReposity: Repository<OrderMainEntity>,
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
        startTime,
        endTime,
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
      let queryBuilder = this.orderReposity
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
}
