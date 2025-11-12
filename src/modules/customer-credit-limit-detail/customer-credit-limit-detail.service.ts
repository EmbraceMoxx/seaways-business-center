import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CustomerCreditLimitDetail } from './customer-credit-limit-detail.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { CustomerCreditLimitService } from '@src/modules/customer-credit-limit/services/customer-credit-limit.service';
import {
  QueryCreditLimiDetailtDto,
  CreditLimitDetailResponseDto,
  CreditLimitDetailRequestDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerService } from '@src/modules/customer/customer.service';

@Injectable()
export class CustomerCreditLimitDetailService {
  constructor(
    @InjectRepository(CustomerCreditLimitDetail)
    private creditDetailRepositor: Repository<CustomerCreditLimitDetail>,
    private customerService: CustomerService,
    private customerCreditLimitService: CustomerCreditLimitService,
    private dataSource: DataSource,
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

  /**
   * 新增客户额度流水
   */
  async addCreditDetail(
    creditParam: CreditLimitDetailRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、获取客户信息
      const customer = await this.customerService.getCustomerInfoById(
        creditParam?.customerId,
      );
      if (!customer) {
        throw new BusinessException('客户不存在');
      }

      // 创建新的额度流水实体
      const creditDetail = new CustomerCreditLimitDetail();
      creditDetail.customerId = creditParam.customerId;
      creditDetail.customerName = creditParam.customerName;
      creditDetail.flowCode = creditParam.flowCode;
      creditDetail.orderId = creditParam.orderId;
      creditDetail.onlineOrderId = creditParam.onlineOrderId;
      creditDetail.shippedAmount = creditParam.shippedAmount;
      creditDetail.auxiliarySaleGoodsAmount =
        creditParam.auxiliarySaleGoodsAmount;
      creditDetail.replenishingGoodsAmount =
        creditParam.replenishingGoodsAmount;
      creditDetail.usedAuxiliarySaleGoodsAmount =
        creditParam.usedAuxiliarySaleGoodsAmount;
      creditDetail.remainAuxiliarySaleGoodsAmount =
        creditParam.remainAuxiliarySaleGoodsAmount;
      creditDetail.usedReplenishingGoodsAmount =
        creditParam.usedReplenishingGoodsAmount;
      creditDetail.remainReplenishingGoodsAmount =
        creditParam.remainReplenishingGoodsAmount;
      creditDetail.payableVoucher = creditParam.payableVoucher;
      // 默认
      creditDetail.deleted = GlobalStatusEnum.NO;
      creditDetail.status = -1;

      // 设置创建时间
      creditDetail.creatorId = userPayload.userId;
      creditDetail.creatorName = userPayload.username;
      creditDetail.createdTime = dayjs().toDate();

      // 设置更新时间
      creditDetail.reviserId = userPayload.userId;
      creditDetail.reviserName = userPayload.username;
      creditDetail.revisedTime = dayjs().toDate();

      return await this.creditDetailRepositor.save(creditDetail);
    } catch (error) {
      throw new BusinessException('新增客户额度流水失败' + error.message);
    }
  }

  /**
   * 确认收款 or 取消订单(事务)
   * @param flag 状态 true:确认收款 false:取消订单
   * @param customerId 客户ID
   * @param user 用户信息
   */
  async onReceipt(flag: boolean, customerId: string, user: JwtUserPayload) {
    try {
      // 1、判断该客户是否存在
      const customer = this.customerService.getCustomerInfoById(customerId);
      if (!customer) {
        throw new BusinessException('客户不存在');
      }
      // 2、事务
      return await this.dataSource.transaction(async (manager) => {
        // 2.1 获取流水详情信息
        const creditDetail = await this.getCreditDetailById(customerId);
        // 2.2、计算并修改客户额度列表的相关金额
        await this.customerCreditLimitService.updateAuxiliaryAndReplenishingAmount(
          creditDetail,
          flag,
          manager,
        );
        // 2.3、修改流水列表的状态 1为已完成，2为已关闭
        const params = {
          status: flag ? 1 : 2,
          reviserId: user?.userId,
          reviserName: user?.username,
          revisedTime: new Date(),
        };
        await manager.update(
          CustomerCreditLimitDetail,
          creditDetail.id,
          params,
        );
      });
    } catch (error) {
      throw new BusinessException(
        `${flag ? '确认收款' : '取消订单'}失败` + error.message,
      );
    }
  }

  /**
   * 获取客户额度流水详情信息
   */
  async getCreditDetailById(
    customerId: string,
  ): Promise<CreditLimitDetailResponseDto> {
    // 获取流水详情
    const creditDetail = await this.creditDetailRepositor.findOneBy({
      customerId,
    });
    return creditDetail;
  }
}
