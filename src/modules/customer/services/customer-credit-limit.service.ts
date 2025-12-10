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
  CreditLimitExportDTO,
  CreditLimitResponseDto,
  CreditLimitDetailRequestDto,
  CreditLimitStatisticsAndFrozenResponseDto,
} from '@src/dto';
import { CustomerCreditAmountInfoEntity } from '../entities/customer-credit-limit.entity';
import { IdUtil } from '@src/utils';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerCreditLimitDetailEntity } from '@modules/customer/entities/customer-credit-limit-detail.entity';
import { MoneyUtil } from '@utils/MoneyUtil';
import { CustomerMonthlyCreditLimitService } from '../services/customer-monthly-credit-limit.server';
import {
  CancelStrategyFactory,
  ConfirmStrategyFactory,
  CreditUpdateStrategyFactory,
} from '@modules/customer/strategy/credit-release.strategy';
import { UpdateAmountVector } from '@modules/customer/strategy/credit-update.strategy';
import { UserService } from '@modules/common/user/user.service';
import { CustomerService } from '@modules/customer/services/customer.service';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class CustomerCreditLimitService {
  private readonly logger = new Logger(CustomerCreditLimitService.name);
  constructor(
    @InjectRepository(CustomerCreditAmountInfoEntity)
    private creditRepository: Repository<CustomerCreditAmountInfoEntity>,
    private customerMonthlyCreditLimitService: CustomerMonthlyCreditLimitService,
    private userService: UserService,
    @Inject(forwardRef(() => CustomerService))
    private customerService: CustomerService,
  ) {}

  async initCustomerCredit(
    customerInfo: CustomerInfoEntity,
    user: JwtUserPayload,
  ): Promise<CustomerCreditAmountInfoEntity> {
    const creditAmountInfo = new CustomerCreditAmountInfoEntity();
    creditAmountInfo.id = IdUtil.generateId();
    creditAmountInfo.customerId = customerInfo.id;
    creditAmountInfo.customerName = customerInfo.customerName;
    creditAmountInfo.region = customerInfo.region;
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
    // 获取客户额度信息
    let creditInfo = await this.getCreditInfoByCustomerId(
      creditParam?.customerId,
    );
    if (!creditInfo) {
      // 若客户首次合作下单，则可能不存在额度记录，则初始化记录
      creditInfo = await this.initCustomerCredit(customerInfo, user);
    }
    this.logger.log('额度汇总操作前数据:', JSON.stringify(creditInfo));
    // 发货金额冻结
    creditInfo.frozenShippedAmount = MoneyUtil.fromYuan(
      creditInfo.frozenShippedAmount,
    )
      .add(MoneyUtil.fromYuan(creditParam.shippedAmount || '0'))
      .toYuan();
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
    user: JwtUserPayload,
    token: string,
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

      // 获取权限
      const checkResult = await this.userService.getRangeOfOrderQueryUser(
        token,
        user.userId,
      );

      const statistics: CreditLimitStatisticsAndFrozenResponseDto = {
        auxiliarySaleGoodsAmount: null,
        frozenReplenishingGoodsAmount: null,
        frozenSaleGoodsAmount: null,
        frozenShippedAmount: null,
        frozenUsedReplenishingGoodsAmount: null,
        frozenUsedSaleGoodsAmount: null,
        remainAuxiliarySaleGoodsAmount: null,
        remainReplenishingGoodsAmount: null,
        repaymentAmount: null,
        replenishingGoodsAmount: null,
        shippedAmount: null,
        usedAuxiliarySaleGoodsAmount: null,
        usedReplenishingGoodsAmount: null,
      };

      if (!checkResult || checkResult.isQueryAll) {
        // 不限制客户范围，继续查询
      } else if (!checkResult.principalUserIds?.length) {
        return { items: [], total: 0, statisticsInfo: statistics };
      } else {
        // 收集所有人负责的客户ID，去查询对应的客户ID
        const customerIds = await this.customerService.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return { items: [], total: 0, statisticsInfo: statistics };
        }

        queryBuilder = queryBuilder.andWhere(
          'credit.customer_id IN (:customerIds)',
          { customerIds },
        );
      }

      // 获取统计信息
      const statisticsInfo = await this.getCreditStatistics(queryBuilder);

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('credit.revised_time', 'DESC')
        .addOrderBy('credit.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getMany();

      return { items, total, statisticsInfo };
    } catch (error) {
      throw new BusinessException('获取客户额度列表失败');
    }
  }

  /**
   * 导出客户额度列表
   * @param query 查询参数
   * @returns 客户额度列表
   */
  async exportCreditInfoList(
    query: QueryCreditLimitDto,
    user: JwtUserPayload,
    token: string,
  ): Promise<CreditLimitExportDTO[]> {
    const { customerName, region } = query;
    // 1、创建查询条件
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
      // 收集所有人负责的客户ID，去查询对应的客户ID
      const customerIds = await this.customerService.getManagedCustomerIds(
        checkResult.principalUserIds,
      );

      // 如果没有客户ID，则返回空
      if (!customerIds.length) {
        return [];
      }

      queryBuilder = queryBuilder.andWhere(
        'credit.customer_id IN (:customerIds)',
        { customerIds },
      );
    }

    queryBuilder = queryBuilder.orderBy({
      'credit.created_time': 'DESC',
      'credit.customer_id': 'DESC',
    });

    // 4、获取数据
    return await queryBuilder.getMany();
  }

  // -------------------------------辅助方法------------------------------------
  /**
   * 获取客户额度列表-客户额度统计累计信息
   */
  private async getCreditStatistics(
    queryBuilder: any,
  ): Promise<CreditLimitStatisticsAndFrozenResponseDto> {
    const stats = await queryBuilder
      .clone()
      .select([
        'SUM(credit.shippedAmount) as shippedAmount',
        'SUM(credit.frozen_shipped_amount) as frozenShippedAmount',
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

      const monthlyCredit =
        await this.customerMonthlyCreditLimitService.getMonthlyCreditInfo(
          customerId,
          currentYear,
          currentMonth,
        );

      // 2、计算出本年度的额度信息（例如当月是11月，计算的就是1月到11月的）
      const annualCredit =
        await this.customerMonthlyCreditLimitService.getAnnualCreditInfo(
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
      shipped?: number; // 新增发货差额
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
    // 发货冻结金额调整
    if (delta.shipped !== undefined) {
      credit.frozenShippedAmount = MoneyUtil.fromYuan(
        credit.frozenShippedAmount,
      )
        .add(delta.shipped)
        .toYuan();
    }
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
    credit.reviserName = user.nickName;
    credit.revisedTime = dayjs().toDate();
    this.logger.log('开始调整差额：', JSON.stringify(credit));
    await creditRepo.update({ id: credit.id }, credit);
  }

  /**
   * 安全释放客户额度（由事务管理器调用）
   * @param customerId 客户ID
   * @param flow 流水数据（含金额）
   * @param user 操作人
   * @param manager 事务管理器
   * @param confirm 是否确认收款（true=累加到已使用）
   * @param isFromJst
   * @param vector
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
    isFromJst = false,
  ): Promise<void> {
    this.logger.log(
      `进入释放额度逻辑：${JSON.stringify(flow)},来自聚水潭：${isFromJst}`,
    );
    const repo = manager.getRepository(CustomerCreditAmountInfoEntity);

    // 1. 先锁额度主表
    const credit = await repo.findOne({
      where: { customerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!credit) {
      throw new BusinessException('客户额度不存在');
    }
    // 1. 确认收款
    if (confirm) {
      const confirmVector = {
        shipped: flow.shippedAmount,
        auxiliary: flow.auxiliarySaleGoodsAmount,
        auxiliaryUsed: flow.usedAuxiliarySaleGoodsAmount,
        replenishing: flow.replenishingGoodsAmount,
        replenishingUsed: flow.usedReplenishingGoodsAmount,
      };
      const result = ConfirmStrategyFactory.get();
      result.apply(credit, confirmVector);
    }
    // 若来自聚水潭取消，则对额度进行扣减
    if (isFromJst) {
      const cancelVector = {
        shipped: flow.shippedAmount,
        auxiliary: flow.auxiliarySaleGoodsAmount,
        auxiliaryUsed: flow.usedAuxiliarySaleGoodsAmount,
        replenishing: flow.replenishingGoodsAmount,
        replenishingUsed: flow.usedReplenishingGoodsAmount,
      };
      this.logger.log(`聚水潭回调取消订单：${JSON.stringify(cancelVector)}`);
      const result = CancelStrategyFactory.get('JST_POST');
      result.apply(credit, cancelVector);
    }
    // 普通的取消流程
    if (!isFromJst && !confirm) {
      const cancelVector = {
        shipped: flow.shippedAmount,
        auxiliary: flow.auxiliarySaleGoodsAmount,
        auxiliaryUsed: flow.usedAuxiliarySaleGoodsAmount,
        replenishing: flow.replenishingGoodsAmount,
        replenishingUsed: flow.usedReplenishingGoodsAmount,
      };
      this.logger.log(`普通取消订单：${JSON.stringify(cancelVector)}`);
      const result = CancelStrategyFactory.get('STANDARD');
      result.apply(credit, cancelVector);
    }
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

    await manager.update(
      CustomerCreditAmountInfoEntity,
      { id: credit.id },
      credit,
    );
  }

  async changeCustomerCreditAmountInTx(
    manager: EntityManager,
    customerId: string,
    updateVector: UpdateAmountVector,
    user: JwtUserPayload,
  ) {
    const repo = manager.getRepository(CustomerCreditAmountInfoEntity);
    const credit = await repo.findOne({
      where: { customerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!credit) throw new BusinessException('客户额度不存在');

    // 直接让策略算差额、改额度
    const strategy = CreditUpdateStrategyFactory.get();
    strategy.apply(credit, updateVector);

    // 允许剩余额度为负
    credit.reviserId = user.userId;
    credit.reviserName = user.nickName;
    credit.revisedTime = dayjs().toDate();
    await repo.update({ id: credit.id }, credit);
  }
}
