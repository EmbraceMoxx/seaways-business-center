import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerCreditLimitDetail } from './customer-credit-limit-detail.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCreditLimiDetailtDto,
  CreditLimitDetailResponseDto,
} from '@src/dto';

@Injectable()
export class CustomerCreditLimitDetailService {
  constructor(
    @InjectRepository(CustomerCreditLimitDetail)
    private creditDetailRepositor: Repository<CustomerCreditLimitDetail>,
  ) {}

  /**
   * 获取客户额度流水列表
   */
  async getCreditDetailPageList(
    params: QueryCreditLimiDetailtDto,
  ): Promise<{ items: CreditLimitDetailResponseDto[]; total: number }> {
    try {
      const { customerName, onlineOrderId, flowCode } = params;
      // 分页参数--页码、页数
      const page = Math.max(1, Number(params.page) || 1);
      const pageSize = Number(params.pageSize) || 20;

      let queryBuilder = this.creditDetailRepositor
        .createQueryBuilder('creditDetail')
        .where('creditDetail.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        });

      // 流水号
      if (flowCode) {
        queryBuilder = queryBuilder.andWhere(
          'creditDetail.flow_code LIKE :flowCode',
          {
            flowCode: `%${flowCode}%`,
          },
        );
      }

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'creditDetail.customer_name LIKE :customerName',
          {
            customerName: `%${customerName}%`,
          },
        );
      }

      // 线上订单号
      if (onlineOrderId) {
        queryBuilder = queryBuilder.andWhere(
          'creditDetail.online_order_id LIKE :onlineOrderId',
          {
            onlineOrderId: `%${onlineOrderId}%`,
          },
        );
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('creditDetail.created_time', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户额度流水列表失败' + error.message);
    }
  }
}
