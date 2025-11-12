import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerCreditAmountInfoEntity } from '../entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from '../entities/customer-monthly-credit-limit.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
  CreditLimitStatisticsResponseDto,
  CustomerInfoCreditResponseDto,
  CreditLimitDetailResponseDto,
  CreditLimitResponseDto,
} from '@src/dto';

@Injectable()
export class CustomerCreditLimitService {
  constructor(
    @InjectRepository(CustomerCreditAmountInfoEntity)
    private creditRepositor: Repository<CustomerCreditAmountInfoEntity>,
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

  /**
   * 转换为数字
   * @param value 待转换的值
   * @returns 转换后的数字
   */
  private toNumber(value: string | number | undefined | null): number {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * 执行数值计算
   * @param value1 第一个值
   * @param value2 第二个值
   * @param operator 运算符 ('+', '-')
   * @returns 计算结果
   */
  private calculate(
    value1: string | number | undefined | null,
    value2: string | number | undefined | null,
    operator: '+' | '-',
  ): string | null {
    const num1 = this.toNumber(value1);
    const num2 = this.toNumber(value2);

    switch (operator) {
      case '+':
        return String(num1 + num2);
      case '-':
        return String(num1 - num2);
      default:
        return null;
    }
  }

  /**
   * 更新辅销品、货补相关金额
   * @param creditDetail 额度流水明细信息
   * @param isProceeds 是否是进账
   * @param manager 数据库事务管理器
   */

  async updateAuxiliaryAndReplenishingAmount(
    creditDetail: CreditLimitDetailResponseDto,
    isProceeds: boolean,
    manager: any,
  ): Promise<void> {
    // 1、获取客户原有额度信息
    const {
      auxiliarySaleGoodsAmount,
      usedAuxiliarySaleGoodsAmount,
      frozenSaleGoodsAmount,
      frozenUsedSaleGoodsAmount,
      replenishingGoodsAmount,
      usedReplenishingGoodsAmount,
      frozenReplenishingGoodsAmount,
      frozenUsedReplenishingGoodsAmount,
    } = await this.getCreditInfoByCustomerId(creditDetail?.customerId);

    // 2、设置参数（默认释放冻结金额）
    let params: Partial<CustomerCreditAmountInfoEntity> = {
      // 冻结产生辅销金额=原本金额-产生辅销额度1
      frozenSaleGoodsAmount: this.calculate(
        frozenSaleGoodsAmount,
        creditDetail?.auxiliarySaleGoodsAmount,
        '-',
      ),
      // 冻结使用辅销金额=原本金额-使用辅销额度1
      frozenUsedSaleGoodsAmount: this.calculate(
        frozenUsedSaleGoodsAmount,
        creditDetail?.usedAuxiliarySaleGoodsAmount,
        '-',
      ),

      // 冻结产生货补金额=原本金额-产生货补额度1
      frozenReplenishingGoodsAmount: this.calculate(
        frozenReplenishingGoodsAmount,
        creditDetail?.replenishingGoodsAmount,
        '-',
      ),
      // 冻结使用货补金额=原本金额-使用货补额度1
      frozenUsedReplenishingGoodsAmount: this.calculate(
        frozenUsedReplenishingGoodsAmount,
        creditDetail?.usedReplenishingGoodsAmount,
        '-',
      ),
    };

    // 3、进账
    if (isProceeds) {
      params = {
        // 3%辅销品金额=原本的金额+产生辅销额度1
        auxiliarySaleGoodsAmount: this.calculate(
          auxiliarySaleGoodsAmount,
          creditDetail?.auxiliarySaleGoodsAmount,
          '+',
        ),
        // 已提辅销金额=原本金额+使用辅销额度1
        usedAuxiliarySaleGoodsAmount: this.calculate(
          usedAuxiliarySaleGoodsAmount,
          creditDetail?.usedAuxiliarySaleGoodsAmount,
          '+',
        ),
        // 10%货补金额=原本的金额+产生货补额度1
        replenishingGoodsAmount: this.calculate(
          replenishingGoodsAmount,
          creditDetail?.replenishingGoodsAmount,
          '+',
        ),
        // 已提货补金额=原本金额+使用货补额度1
        usedReplenishingGoodsAmount: this.calculate(
          usedReplenishingGoodsAmount,
          creditDetail?.usedReplenishingGoodsAmount,
          '+',
        ),
      };

      // 剩余辅销金额=3%辅销品金额-已提辅销金额
      params.remainAuxiliarySaleGoodsAmount = this.calculate(
        params.auxiliarySaleGoodsAmount,
        params.usedAuxiliarySaleGoodsAmount,
        '-',
      );

      // 剩余货补金额=10%货补金额-已提货补金额
      params.remainReplenishingGoodsAmount = this.calculate(
        params.replenishingGoodsAmount,
        params.usedReplenishingGoodsAmount,
        '-',
      );
    }
    // 4、更新额度信息
    await manager.update(
      CustomerCreditAmountInfoEntity,
      { customerId: creditDetail?.customerId },
      params,
    );
  }

  /**
   * 获取客户额度信息
   * @param customerId 客户ID
   */
  async getCreditInfoByCustomerId(
    customerId: string,
  ): Promise<CreditLimitResponseDto> {
    return await this.creditRepositor.findOneBy({ customerId });
  }
}
