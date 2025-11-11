import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerCreditAmountInfoEntity } from '../entities/customer-credit-limit.entity';
import { CustomerInfoEntity } from '../entities/customer-info.entity';
import { CustomerMonthlyCreditLimitEntity } from '../entities/customer-monthly-credit-limit.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
  CreditLimitStatisticsResponseDto,
  CustomerInfoResponseDto,
  CustomerInfoCreditResponseDto,
  CustomerInfoUpdateDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';

@Injectable()
export class CustomerCreditLimitService {
  constructor(
    @InjectRepository(CustomerCreditAmountInfoEntity)
    private creditRepositor: Repository<CustomerCreditAmountInfoEntity>,
    @InjectRepository(CustomerInfoEntity)
    private customerInfoRepositor: Repository<CustomerInfoEntity>,
    @InjectRepository(CustomerMonthlyCreditLimitEntity)
    private monthlyCreditRepositor: Repository<CustomerMonthlyCreditLimitEntity>,
  ) {}

  /**
   * 获取客户额度列表
   */
  async getCreditPageList(
    params: QueryCreditLimitDto,
  ): Promise<CreditLimitListResponseDto> {
    try {
      const { customerName, region } = params;
      // 分页参数--页码、页数
      const page = Math.max(1, Number(params.page) || 1);
      const pageSize = Number(params.pageSize) || 20;

      let queryBuilder = this.creditRepositor
        .createQueryBuilder('credit')
        .where('credit.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        });

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'credit.customer_name LIKE :customerName',
          {
            customerName: `%${customerName}%`,
          },
        );
      }

      // 客户所属区域
      if (region) {
        queryBuilder = queryBuilder.andWhere('credit.region = :region', {
          region,
        });
      }

      // 获取统计信息
      const statisticsInfo = await this.getCreditStatistics(queryBuilder);

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('credit.created_time', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getMany();

      return { items, total, statisticsInfo };
    } catch (error) {
      throw new BusinessException('获取客户额度列表失败');
    }
  }

  /**
   * 获取客户额详情
   */
  async getCustomerInfoById(id: string): Promise<
    CustomerInfoResponseDto & {
      creditInfo: CustomerInfoCreditResponseDto;
    }
  > {
    try {
      // 查询详情
      const customerInfo = await this.customerInfoRepositor.findOne({
        where: {
          id,
          deleted: GlobalStatusEnum.NO,
        },
      });

      // 获取客户额度详情-额度信息
      const creditInfo = await this.getCustomerCreditInfo(id);

      return { ...customerInfo, creditInfo };
    } catch (error) {
      throw new BusinessException('获取客户详情失败');
    }
  }

  /**
   * 更新客户
   */
  async updateCustomerInfo(
    customerId: string,
    customerData: CustomerInfoUpdateDto,
    user: JwtUserPayload,
  ) {
    try {
      // 1、获判断客户是否存在
      const customerInfo = await this.getCustomerInfoById(customerId);
      if (!customerInfo) {
        throw new BusinessException('客户不存在');
      }
      // 2、更新客户信息
      const customer = new CustomerInfoEntity();
      customer.id = customerId;
      customer.regionalHead = customerData?.regionalHead;
      customer.provincialHead = customerData?.provincialHead;
      customer.distributorType = customerData?.distributorType;
      customer.contractValidityPeriod = customerData?.contractValidityPeriod;
      customer.contractAmount = customerData?.contractAmount;
      customer.reconciliationMail = customerData?.reconciliationMail;
      customer.coStatus = customerData?.coStatus;

      // 3、当前更新人信息
      customer.reviserId = user.userId;
      customer.reviserName = user.username;
      customer.revisedTime = dayjs().toDate();

      // 4、执行更新
      await this.customerInfoRepositor.update(customerId, customer);
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  // -------------------------------辅助方法------------------------------------
  /**
   * 获取客户额度列表-客户额度统计累计信息
   */
  private async getCreditStatistics(
    queryBuilder: any,
  ): Promise<CreditLimitStatisticsResponseDto> {
    const stats = await queryBuilder
      .clone()
      .select([
        'SUM(credit.shippedAmount) as shippedAmount',
        'SUM(credit.repaymentAmount) as repaymentAmount',
        'SUM(credit.auxiliarySaleGoodsAmount) as auxiliarySaleGoodsAmount',
        'SUM(credit.usedAuxiliarySaleGoodsAmount) as usedAuxiliarySaleGoodsAmount',
        'SUM(credit.frozenSaleGoodsAmount) as frozenSaleGoodsAmount',
        'SUM(credit.frozenUsedSaleGoodsAmount) as frozenUsedSaleGoodsAmount',
        'SUM(credit.remainAuxiliarySaleGoodsAmount) as remainAuxiliarySaleGoodsAmount',
        'SUM(credit.replenishingGoodsAmount) as replenishingGoodsAmount',
        'SUM(credit.usedReplenishingGoodsAmount) as usedReplenishingGoodsAmount',
        'SUM(credit.frozenReplenishingGoodsAmount) as frozenReplenishingGoodsAmount',
        'SUM(credit.frozenUsedReplenishingGoodsAmount) as frozenUsedReplenishingGoodsAmount',
        'SUM(credit.remainReplenishingGoodsAmount) as remainReplenishingGoodsAmount',
      ])
      .getRawOne();

    return stats;
  }

  /**
   * 获取客户额度详情-额度信息
   */
  async getCustomerCreditInfo(
    customerId: string,
  ): Promise<CustomerInfoCreditResponseDto> {
    try {
      // 默认信息
      const defaultCreditInfo: CreditLimitStatisticsResponseDto = {
        shippedAmount: '',
        repaymentAmount: '',
        auxiliarySaleGoodsAmount: '',
        usedAuxiliarySaleGoodsAmount: '',
        remainAuxiliarySaleGoodsAmount: '',
        replenishingGoodsAmount: '',
        usedReplenishingGoodsAmount: '',
        remainReplenishingGoodsAmount: '',
      };
      // 1、先获取当月的客户月度信息
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const monthlyCredit = await this.getMonthlyCreditInfo(
        customerId,
        currentYear,
        currentMonth,
      );

      // 2、计算出本年度的额度信息（例如当月是11月，计算的就是1月到11月的）
      const annualCredit = await this.getAnnualCreditInfo(
        customerId,
        currentYear,
        currentMonth,
      );

      // 3、获取客户累计额度信息
      const cumulativeCredit = await this.getCumulativeCreditInfo(customerId);

      return {
        monthlyCredit: monthlyCredit || defaultCreditInfo,
        annualCredit: annualCredit || defaultCreditInfo,
        cumulativeCredit: cumulativeCredit || defaultCreditInfo,
      };
    } catch (error) {
      throw new BusinessException('获取客户详情失败');
    }
  }

  /**
   * 获取当月的客户月度信息
   * @param customerId 客户ID
   * @param year 年份
   * @param month 月份
   */
  private async getMonthlyCreditInfo(
    customerId: string,
    year: number,
    month: number,
  ): Promise<CreditLimitStatisticsResponseDto> {
    const yearMonth = year * 100 + month;

    return await this.monthlyCreditRepositor
      .createQueryBuilder('monthly')
      .select([
        'monthly.shipped_amount AS shippedAmount',
        'monthly.repayment_amount AS repaymentAmount',
        'monthly.auxiliary_sale_goods_amount AS auxiliarySaleGoodsAmount',
        'monthly.used_auxiliary_sale_goods_amount AS usedAuxiliarySaleGoodsAmount',
        'monthly.remain_auxiliary_sale_goods_amount AS remainAuxiliarySaleGoodsAmount',
        'monthly.replenishing_goods_amount AS replenishingGoodsAmount',
        'monthly.used_replenishing_goods_amount AS usedReplenishingGoodsAmount',
        'monthly.remain_replenishing_goods_amount AS remainReplenishingGoodsAmount',
      ])
      .where('monthly.customer_id = :customerId', { customerId })
      .andWhere('monthly.biz_year_month = :yearMonth', { yearMonth })
      .andWhere('monthly.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
      .getRawOne();
  }

  /**
   * 获取客户本年度额度信息汇总
   * @param customerId 客户ID
   * @param year 年份
   * @param month 当前月份
   */
  private async getAnnualCreditInfo(
    customerId: string,
    year: number,
    month: number,
  ): Promise<CreditLimitStatisticsResponseDto> {
    const startYearMonth = year * 100 + 1; // 年初 (如202301)
    const endYearMonth = year * 100 + month; // 当前月 (如202311)

    const annualSummary = await this.monthlyCreditRepositor
      .createQueryBuilder('monthly')
      .select([
        'SUM(monthly.shipped_amount) AS shippedAmount',
        'SUM(monthly.repayment_amount) AS repaymentAmount',
        'SUM(monthly.auxiliary_sale_goods_amount) AS auxiliarySaleGoodsAmount',
        'SUM(monthly.used_auxiliary_sale_goods_amount) AS usedAuxiliarySaleGoodsAmount',
        'SUM(monthly.remain_auxiliary_sale_goods_amount) AS remainAuxiliarySaleGoodsAmount',
        'SUM(monthly.replenishing_goods_amount) AS replenishingGoodsAmount',
        'SUM(monthly.used_replenishing_goods_amount) AS usedReplenishingGoodsAmount',
        'SUM(monthly.remain_replenishing_goods_amount) AS remainReplenishingGoodsAmount',
      ])
      .where('monthly.customer_id = :customerId', { customerId })
      .andWhere('monthly.biz_year_month >= :startYearMonth', { startYearMonth })
      .andWhere('monthly.biz_year_month <= :endYearMonth', { endYearMonth })
      .andWhere('monthly.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
      .getRawOne();

    return annualSummary;
  }

  /**
   * 获取客户累计额度信息
   * @param customerId 客户ID
   */
  private async getCumulativeCreditInfo(
    customerId: string,
  ): Promise<CreditLimitStatisticsResponseDto> {
    return await this.creditRepositor
      .createQueryBuilder('credit')
      .select([
        'credit.shipped_amount AS shippedAmount',
        'credit.repayment_amount AS repaymentAmount',
        'credit.auxiliary_sale_goods_amount AS auxiliarySaleGoodsAmount',
        'credit.used_auxiliary_sale_goods_amount AS usedAuxiliarySaleGoodsAmount',
        'credit.remain_auxiliary_sale_goods_amount AS remainAuxiliarySaleGoodsAmount',
        'credit.replenishing_goods_amount AS replenishingGoodsAmount',
        'credit.used_replenishing_goods_amount AS usedReplenishingGoodsAmount',
        'credit.remain_replenishing_goods_amount AS remainReplenishingGoodsAmount',
      ])
      .where('credit.customer_id = :customerId', { customerId })
      .andWhere('credit.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
      .getRawOne();
  }
}
