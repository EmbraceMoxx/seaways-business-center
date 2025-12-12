import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerMonthlyCreditLimitEntity } from '../entities/customer-monthly-credit-limit.entity';
import { MoneyUtil } from '@utils/MoneyUtil';
import {
  CreditLimitStatisticsResponseDto,
  QueryMonthlyCreditDto,
  CreditToMonthResponseDto,
} from '@src/dto';

@Injectable()
export class CustomerMonthlyCreditLimitService {
  constructor(
    @InjectRepository(CustomerMonthlyCreditLimitEntity)
    private customerMonthlyCreditRepository: Repository<CustomerMonthlyCreditLimitEntity>,
  ) {}

  /**
   * 根据客户id和年月查询月度额度流水
   */
  async findByCustomerIdAndMonth(
    customerId: string,
    bizYear: number,
    bizMonth: number,
  ): Promise<CustomerMonthlyCreditLimitEntity> {
    return await this.customerMonthlyCreditRepository.findOne({
      where: {
        customerId,
        bizYear,
        bizMonth,
      },
    });
  }

  /**
   * 新增月度额度流水
   */
  async create(creditDetail: QueryMonthlyCreditDto, user: JwtUserPayload) {
    // 1、初始化数据
    const customerMonthlyCredit = new CustomerMonthlyCreditLimitEntity();

    // 2、初始化字段
    customerMonthlyCredit.customerId = creditDetail.customerId;
    customerMonthlyCredit.customerName = creditDetail.customerName;
    customerMonthlyCredit.region = creditDetail.region;
    customerMonthlyCredit.bizYear = creditDetail.bizYear;
    customerMonthlyCredit.bizMonth = creditDetail.bizMonth;
    customerMonthlyCredit.bizYearMonth = creditDetail.bizYearMonth;

    // 3、初始化金额
    customerMonthlyCredit.contractMissionAmount = '0';
    customerMonthlyCredit.shippedAmount = '0';
    customerMonthlyCredit.repaymentAmount = '0';
    customerMonthlyCredit.auxiliarySaleGoodsAmount = '0';
    customerMonthlyCredit.replenishingGoodsAmount = '0';
    customerMonthlyCredit.usedAuxiliarySaleGoodsAmount = '0';
    customerMonthlyCredit.remainAuxiliarySaleGoodsAmount = '0';
    customerMonthlyCredit.usedReplenishingGoodsAmount = '0';
    customerMonthlyCredit.remainReplenishingGoodsAmount = '0';

    // 4、默认状态
    customerMonthlyCredit.deleted = GlobalStatusEnum.NO;
    customerMonthlyCredit.creatorId = user.userId;
    customerMonthlyCredit.creatorName = user.nickName;
    customerMonthlyCredit.createdTime = dayjs().toDate();
    customerMonthlyCredit.reviserId = user.userId;
    customerMonthlyCredit.reviserName = user.nickName;
    customerMonthlyCredit.revisedTime = dayjs().toDate();

    // 5、保存
    return await this.customerMonthlyCreditRepository.save(
      customerMonthlyCredit,
    );
  }

  /**
   * 更新月度额度流水-累加金额
   */
  async updateWithIncrement(
    creditDetail: CreditToMonthResponseDto,
    existingRecordId: string,
    user: JwtUserPayload,
  ) {
    const {
      shippedAmount,
      auxiliarySaleGoodsAmount,
      replenishingGoodsAmount,
      usedAuxiliarySaleGoodsAmount,
      usedReplenishingGoodsAmount,
    } = creditDetail;

    // 1、更新字段（覆盖式）
    const updatedFields: Partial<CustomerMonthlyCreditLimitEntity> = {
      contractMissionAmount: shippedAmount,
      shippedAmount: shippedAmount,
      auxiliarySaleGoodsAmount: auxiliarySaleGoodsAmount,
      replenishingGoodsAmount: replenishingGoodsAmount,
      usedAuxiliarySaleGoodsAmount: usedAuxiliarySaleGoodsAmount,
      usedReplenishingGoodsAmount: usedReplenishingGoodsAmount,
      reviserId: user.userId,
      reviserName: user.nickName,
      revisedTime: dayjs().toDate(),
    };

    // 2、重新计算剩余额度
    updatedFields.remainAuxiliarySaleGoodsAmount = MoneyUtil.fromYuan3(
      updatedFields.auxiliarySaleGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan3(updatedFields.usedAuxiliarySaleGoodsAmount))
      .toYuan3();
    updatedFields.remainReplenishingGoodsAmount = MoneyUtil.fromYuan3(
      updatedFields.replenishingGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan3(updatedFields.usedReplenishingGoodsAmount))
      .toYuan3();

    // 3、更新
    return await this.customerMonthlyCreditRepository.update(
      existingRecordId,
      updatedFields,
    );
  }

  /**
   * 获取当月的客户月度信息
   * @param customerId 客户ID
   * @param year 年份
   * @param month 月份
   */
  async getMonthlyCreditInfo(
    customerId: string,
    year: number,
    month: number,
  ): Promise<CreditLimitStatisticsResponseDto> {
    const yearMonth = year * 100 + month;

    return await this.customerMonthlyCreditRepository
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
  async getAnnualCreditInfo(
    customerId: string,
    year: number,
    month: number,
  ): Promise<CreditLimitStatisticsResponseDto> {
    const startYearMonth = year * 100 + 1; // 年初 (如202301)
    const endYearMonth = year * 100 + month; // 当前月 (如202311)

    const annualSummary = await this.customerMonthlyCreditRepository
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
}
