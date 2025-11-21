import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
  CreditLimitStatisticsResponseDto,
  CustomerInfoCreditResponseDto,
  CreditLimitDetailResponseDto,
  CreditLimitResponseDto,
  CreditLimitDetailRequestDto,
} from '@src/dto';
import { CustomerCreditAmountInfoEntity } from '../entities/customer-credit-limit.entity';
import { CustomerMonthlyCreditLimitEntity } from '../entities/customer-monthly-credit-limit.entity';
import { IdUtil } from '@src/utils';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerCreditLimitDetailEntity } from '@modules/customer/entities/customer-credit-limit-detail.entity';
import { MoneyUtil } from '@utils/MoneyUtil';

@Injectable()
export class CustomerCreditLimitService {
  private readonly logger = new Logger(CustomerCreditLimitService.name);
  constructor(
    @InjectRepository(CustomerCreditAmountInfoEntity)
    private creditRepository: Repository<CustomerCreditAmountInfoEntity>,
    @InjectRepository(CustomerMonthlyCreditLimitEntity)
    private monthlyCreditRepository: Repository<CustomerMonthlyCreditLimitEntity>,
  ) {}

  async initCustomerCredit(
    customerInfo: CustomerInfoEntity,
    user: JwtUserPayload,
  ): Promise<CustomerCreditAmountInfoEntity> {
    const creditAmountInfo = new CustomerCreditAmountInfoEntity();
    creditAmountInfo.id = IdUtil.generateId();
    creditAmountInfo.customerName = customerInfo.customerName;
    creditAmountInfo.region = customerInfo.region;
    // creditAmountInfo.shippedAmount = '0';
    // creditAmountInfo.repaymentAmount = '0';
    // creditAmountInfo.auxiliarySaleGoodsAmount = '0';
    // creditAmountInfo.replenishingGoodsAmount = '0';
    // creditAmountInfo.usedAuxiliarySaleGoodsAmount = '0';
    // creditAmountInfo.frozenSaleGoodsAmount = '0';
    // creditAmountInfo.frozenUsedSaleGoodsAmount = '0';
    // creditAmountInfo.remainAuxiliarySaleGoodsAmount = '0';
    // creditAmountInfo.usedReplenishingGoodsAmount = '0';
    // creditAmountInfo.frozenReplenishingGoodsAmount = '0';
    // creditAmountInfo.frozenUsedReplenishingGoodsAmount = '0';
    // creditAmountInfo.remainReplenishingGoodsAmount = '0';
    creditAmountInfo.deleted = GlobalStatusEnum.NO;
    creditAmountInfo.creatorId = user.userId;
    creditAmountInfo.creatorName = user.nickName;
    creditAmountInfo.createdTime = dayjs().toDate();
    creditAmountInfo.reviserId = user.userId;
    creditAmountInfo.reviserName = user.nickName;
    creditAmountInfo.revisedTime = dayjs().toDate();
    await this.creditRepository.save(creditAmountInfo);
    return creditAmountInfo;
  }

  /**
   * 根据客户信息冻结信用额度
   * @param creditParam 信用额度详情请求参数，包含客户ID、发货金额、辅销商品金额等信息
   * @param customerInfo 客户信息实体
   * @param user JWT用户负载信息，包含当前操作用户的信息
   */
  async frozenCreditByCustomer(
    creditParam: CreditLimitDetailRequestDto,
    customerInfo: CustomerInfoEntity,
    user: JwtUserPayload,
  ) {
    let creditInfo = new CustomerCreditAmountInfoEntity();
    // 获取客户额度信息
    creditInfo = await this.getCreditInfoByCustomerId(creditParam?.customerId);
    if (!creditInfo) {
      // 若客户首次合作下单，则可能不存在额度记录，则初始化记录
      creditInfo = await this.initCustomerCredit(customerInfo, user);
    }
    this.logger.log('额度汇总操作前数据:', JSON.stringify(creditInfo));
    // 辅销金额
    creditInfo.frozenSaleGoodsAmount = MoneyUtil.fromYuan(
      creditInfo.frozenSaleGoodsAmount,
    )
      .add(MoneyUtil.fromYuan(creditParam.auxiliarySaleGoodsAmount))
      .toYuan();
    creditInfo.frozenUsedSaleGoodsAmount = MoneyUtil.fromYuan(
      creditInfo.frozenUsedSaleGoodsAmount,
    )
      .add(MoneyUtil.fromYuan(creditParam.usedAuxiliarySaleGoodsAmount))
      .toYuan();
    // 货补金额
    creditInfo.frozenReplenishingGoodsAmount = MoneyUtil.fromYuan(
      creditInfo.frozenReplenishingGoodsAmount,
    )
      .add(MoneyUtil.fromYuan(creditParam.replenishingGoodsAmount))
      .toYuan();
    creditInfo.frozenUsedReplenishingGoodsAmount = MoneyUtil.fromYuan(
      creditInfo.frozenUsedReplenishingGoodsAmount,
    )
      .add(MoneyUtil.fromYuan(creditParam.usedReplenishingGoodsAmount))
      .toYuan();
    // 剩余货补金额
    creditInfo.remainReplenishingGoodsAmount = MoneyUtil.fromYuan(
      creditInfo.replenishingGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(creditInfo.usedReplenishingGoodsAmount))
      .sub(MoneyUtil.fromYuan(creditInfo.frozenUsedReplenishingGoodsAmount))
      .toYuan();
    // 剩余辅销金额
    creditInfo.remainAuxiliarySaleGoodsAmount = MoneyUtil.fromYuan(
      creditInfo.auxiliarySaleGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(creditInfo.usedAuxiliarySaleGoodsAmount))
      .sub(MoneyUtil.fromYuan(creditInfo.frozenUsedSaleGoodsAmount))
      .toYuan();

    creditInfo.reviserId = user.userId;
    creditInfo.reviserName = user.nickName;
    creditInfo.revisedTime = dayjs().toDate();
    console.log('frozen final creditInfo:', JSON.stringify(creditInfo));
    await this.creditRepository.update({ id: creditInfo.id }, creditInfo);
  }


  /**
   * 获取客户额度列表
   */
  async getCreditPageList(
    params: QueryCreditLimitDto,
  ): Promise<CreditLimitListResponseDto> {
    try {
      const { customerName, region, page, pageSize } = params;

      let queryBuilder = this.creditRepository
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
        .orderBy('credit.id', 'DESC')
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

    return await this.monthlyCreditRepository
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

    const annualSummary = await this.monthlyCreditRepository
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
    return await this.creditRepository
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
      id,
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
        ...params,
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
    await manager.update(CustomerCreditAmountInfoEntity, id, params);
  }

  /**
   * 获取客户额度信息
   * @param customerId 客户ID
   */
  async getCreditInfoByCustomerId(
    customerId: string,
  ): Promise<CreditLimitResponseDto> {
    return await this.creditRepository.findOneBy({ customerId });
  }

  async changeCustomerCreditAmount(
    manager: EntityManager,
    oldFlow: CustomerCreditLimitDetailEntity,
    delta: {
      replenishing: number;
      auxiliary: number;
      replenishingUsed: number;
      auxiliaryUsed: number;
    },
    user: JwtUserPayload,
  ) {
    const creditRepo = manager.getRepository(CustomerCreditAmountInfoEntity);
    const credit = await creditRepo.findOne({
      where: { customerId: oldFlow.customerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!credit) {
      throw new BusinessException('客户额度信息不存在');
    }
    // 4.1 调整冻结额度
    credit.frozenSaleGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenSaleGoodsAmount,
    )
      .add(delta.auxiliary)
      .toYuan();

    credit.frozenUsedSaleGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenUsedSaleGoodsAmount,
    )
      .add(delta.auxiliaryUsed)
      .toYuan();
    credit.frozenReplenishingGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenReplenishingGoodsAmount,
    )
      .add(delta.replenishing)
      .toYuan();
    credit.frozenUsedReplenishingGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenUsedReplenishingGoodsAmount,
    )
      .add(delta.replenishingUsed)
      .toYuan();
    // 4.2 重新计算剩余额度
    credit.remainAuxiliarySaleGoodsAmount = MoneyUtil.fromYuan(
      credit.auxiliarySaleGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(credit.usedAuxiliarySaleGoodsAmount))
      .sub(MoneyUtil.fromYuan(credit.frozenUsedSaleGoodsAmount))
      .toYuan();
    credit.remainReplenishingGoodsAmount = MoneyUtil.fromYuan(
      credit.replenishingGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(credit.usedReplenishingGoodsAmount))
      .sub(MoneyUtil.fromYuan(credit.frozenUsedReplenishingGoodsAmount))
      .toYuan();
    credit.reviserId = user.userId;
    credit.reviserName = user.username;
    credit.revisedTime = dayjs().toDate();
    this.logger.log('开始调整差额：',JSON.stringify(credit));
    await creditRepo.update({ id: credit.id }, credit);
  }

  // customer-credit-limit.service.ts

  /**
   * 安全释放客户额度（由事务管理器调用）
   * @param customerId 客户ID
   * @param flow 流水数据（含金额）
   * @param user 操作人
   * @param manager 事务管理器
   * @param confirm 是否确认收款（true=累加到已使用）
   */
  async releaseCreditInTransaction(
    customerId: string,
    flow: Pick<
      CustomerCreditLimitDetailEntity,
      | 'auxiliarySaleGoodsAmount'
      | 'usedAuxiliarySaleGoodsAmount'
      | 'replenishingGoodsAmount'
      | 'usedReplenishingGoodsAmount'
      | 'shippedAmount'
    >,
    user: JwtUserPayload,
    manager: EntityManager,
    confirm: boolean,
  ): Promise<void> {
    const repo = manager.getRepository(CustomerCreditAmountInfoEntity);

    // 1. 先锁额度主表
    const credit = await repo.findOne({
      where: { customerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!credit) {
      throw new BusinessException('客户额度不存在');
    }

    //  2. 释放冻结金额
    credit.frozenSaleGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenSaleGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(flow.auxiliarySaleGoodsAmount))
      .toYuan();
    credit.frozenUsedSaleGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenUsedSaleGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(flow.usedAuxiliarySaleGoodsAmount))
      .toYuan();
    credit.frozenReplenishingGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenReplenishingGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(flow.replenishingGoodsAmount))
      .toYuan();
    credit.frozenUsedReplenishingGoodsAmount = MoneyUtil.fromYuan(
      credit.frozenUsedReplenishingGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(flow.usedReplenishingGoodsAmount))
      .toYuan();

    // 3. 若确认收款，则累加到已使用
    if (confirm) {
      credit.shippedAmount = MoneyUtil.fromYuan(credit.shippedAmount)
        .add(MoneyUtil.fromYuan(flow.shippedAmount))
        .toYuan();
      credit.auxiliarySaleGoodsAmount = MoneyUtil.fromYuan(
        credit.auxiliarySaleGoodsAmount,
      )
        .add(MoneyUtil.fromYuan(flow.auxiliarySaleGoodsAmount))
        .toYuan();
      credit.usedAuxiliarySaleGoodsAmount = MoneyUtil.fromYuan(
        credit.usedAuxiliarySaleGoodsAmount,
      )
        .add(MoneyUtil.fromYuan(flow.usedAuxiliarySaleGoodsAmount))
        .toYuan();
      credit.replenishingGoodsAmount = MoneyUtil.fromYuan(
        credit.replenishingGoodsAmount,
      )
        .add(MoneyUtil.fromYuan(flow.replenishingGoodsAmount))
        .toYuan();
      credit.usedReplenishingGoodsAmount = MoneyUtil.fromYuan(
        credit.usedReplenishingGoodsAmount,
      )
        .add(MoneyUtil.fromYuan(flow.usedReplenishingGoodsAmount))
        .toYuan();
    }

    //  4. 重新计算剩余额度
    credit.remainAuxiliarySaleGoodsAmount = MoneyUtil.fromYuan(
      credit.auxiliarySaleGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(credit.usedAuxiliarySaleGoodsAmount))
      .sub(MoneyUtil.fromYuan(credit.frozenUsedSaleGoodsAmount))
      .toYuan();
    credit.remainReplenishingGoodsAmount = MoneyUtil.fromYuan(
      credit.replenishingGoodsAmount,
    )
      .sub(MoneyUtil.fromYuan(credit.usedReplenishingGoodsAmount))
      .sub(MoneyUtil.fromYuan(credit.frozenUsedReplenishingGoodsAmount))
      .toYuan();

    credit.reviserId = user.userId;
    credit.reviserName = user.nickName;
    credit.revisedTime = dayjs().toDate();

    await repo.update({ id: credit.id }, credit);
  }
}
