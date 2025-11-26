import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCreditLimiDetailtDto,
  CreditLimitDetailResponseDto,
  CreditLimitDetailRequestDto,
  QueryCreditToMonthDto,
  CreditToMonthResponseDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { TimeFormatterUtil } from '@utils/time-formatter.util';
import { CustomerCreditLimitDetailEntity } from '../entities/customer-credit-limit-detail.entity';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';
import { CustomerService } from '../services/customer.service';
import { IdUtil } from '@src/utils';
import { CreditStatusEnum } from '@src/enums/credit-status.enum';
import { MoneyUtil } from '@utils/MoneyUtil';
import { CustomerInfoEntity } from '../entities/customer.entity';
import { CustomerMonthlyCreditLimitService } from '../services/customer-monthly-credit-limit.server';
@Injectable()
export class CustomerCreditLimitDetailService {
  private readonly logger = new Logger(CustomerCreditLimitDetailService.name);
  constructor(
    @InjectRepository(CustomerCreditLimitDetailEntity)
    private creditDetailRepository: Repository<CustomerCreditLimitDetailEntity>,
    private customerService: CustomerService,
    private customerCreditLimitService: CustomerCreditLimitService,
    private dataSource: DataSource,
    private customerMonthlyCreditLimitService: CustomerMonthlyCreditLimitService,
  ) {}

  /**
   * 获取客户额度流水列表
   */
  async getCreditDetailPageList(
    params: QueryCreditLimiDetailtDto,
  ): Promise<{ items: CreditLimitDetailResponseDto[]; total: number }> {
    try {
      const {
        customerName,
        onlineOrderId,
        flowCode,
        startTime,
        endTime,
        page,
        pageSize,
      } = params;

      let queryBuilder = this.creditDetailRepository
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

      // 时间范围查询
      if (startTime || endTime) {
        const timeRange = TimeFormatterUtil.getTimeRange(startTime, endTime);

        if (startTime && endTime) {
          // 时间范围查询：开始时间 <= created_time <= 结束时间
          queryBuilder = queryBuilder.andWhere(
            'creditDetail.created_time BETWEEN :startTime AND :endTime',
            {
              startTime: timeRange.start,
              endTime: timeRange.end,
            },
          );
        } else if (startTime) {
          // 只查询开始时间之后的数据：created_time >= 开始时间
          queryBuilder = queryBuilder.andWhere(
            'creditDetail.created_time >= :startTime',
            {
              startTime: timeRange.start,
            },
          );
        } else if (endTime) {
          // 只查询结束时间之前的数据：created_time <= 结束时间
          queryBuilder = queryBuilder.andWhere(
            'creditDetail.created_time <= :endTime',
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
        .orderBy('creditDetail.created_time', 'DESC')
        .orderBy('creditDetail.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户额度流水列表失败' + error.message);
    }
  }
  /**
   * 添加客户订单流水信息
   * @param creditParam 授信参数详情请求对象
   * @param userPayload JWT用户负载信息
   */
  async addCustomerOrderCredit(
    creditParam: CreditLimitDetailRequestDto,
    userPayload: JwtUserPayload,
  ) {
    // 添加流水记录
    this.logger.log('开始添加客户流水信息：', JSON.stringify(creditParam));
    // 1、获取客户信息
    const customer = await this.customerService.getCustomerBaseInfoById(
      creditParam?.customerId,
    );
    creditParam.customerName = customer.customerName;
    if (!customer) {
      this.logger.warn('客户不存在：');
      throw new BusinessException('客户不存在');
    }

    await this.addCreditDetail(creditParam, userPayload);
    // 锁定客户流水
    await this.customerCreditLimitService.frozenCreditByCustomer(
      creditParam,
      customer,
      userPayload,
    );
  }
  /**
   * 编辑客户订单授信信息
   * @param creditParam - 授信限额详情请求参数对象，包含订单ID、发货金额、辅助销售商品金额等信息
   * @param user - JWT用户负载信息，包含用户ID和用户名
   * @param confirm
   */
  async editCustomerOrderCredit(
    creditParam: CreditLimitDetailRequestDto,
    user: JwtUserPayload,
  ) {
    this.logger.log('开始编辑客户流水！');
    return this.dataSource.transaction(async (manager) => {
      // 1. 加锁拿到原流水
      const flowRepo = manager.getRepository(CustomerCreditLimitDetailEntity);
      const oldFlow = await flowRepo.findOne({
        where: {
          orderId: creditParam.orderId,
          deleted: GlobalStatusEnum.NO,
          status: CreditStatusEnum.FROZEN,
        },
        lock: { mode: 'pessimistic_write' }, // 行锁
      });
      if (!oldFlow) {
        throw new BusinessException('订单流水不存在或状态非冻结，不允许修改');
      }

      // 2. 计算各字段差额（新 - 旧）
      const delta = {
        shipped: MoneyUtil.fromYuan(creditParam.shippedAmount)
          .sub(MoneyUtil.fromYuan(oldFlow.shippedAmount))
          .toNumber(),

        auxiliary: MoneyUtil.fromYuan(creditParam.auxiliarySaleGoodsAmount)
          .sub(MoneyUtil.fromYuan(oldFlow.auxiliarySaleGoodsAmount))
          .toNumber(),

        auxiliaryUsed: MoneyUtil.fromYuan(
          creditParam.usedAuxiliarySaleGoodsAmount,
        )
          .sub(MoneyUtil.fromYuan(oldFlow.usedAuxiliarySaleGoodsAmount))
          .toNumber(),

        replenishing: MoneyUtil.fromYuan(creditParam.replenishingGoodsAmount)
          .sub(MoneyUtil.fromYuan(oldFlow.replenishingGoodsAmount))
          .toNumber(),

        replenishingUsed: MoneyUtil.fromYuan(
          creditParam.usedReplenishingGoodsAmount,
        )
          .sub(MoneyUtil.fromYuan(oldFlow.usedReplenishingGoodsAmount))
          .toNumber(),
      };
      this.logger.log('差额信息：', JSON.stringify(delta));
      // 3. 更新流水金额
      const updFlow = {
        ...oldFlow,
        shippedAmount: creditParam.shippedAmount,
        auxiliarySaleGoodsAmount: creditParam.auxiliarySaleGoodsAmount,
        usedAuxiliarySaleGoodsAmount: creditParam.usedAuxiliarySaleGoodsAmount,
        replenishingGoodsAmount: creditParam.replenishingGoodsAmount,
        usedReplenishingGoodsAmount: creditParam.usedReplenishingGoodsAmount,
        reviserId: user.userId,
        reviserName: user.nickName,
        revisedTime: dayjs().toDate(),
      };
      this.logger.log('updFlow：', JSON.stringify(updFlow));

      await flowRepo.update({ id: oldFlow.id }, updFlow);
      // 4. 用差额调整客户额度（冻结金额）
      await this.customerCreditLimitService.changeCustomerCreditAmount(
        manager,
        oldFlow,
        delta,
        user,
      );
    });
  }

  /**
   * 关闭客户订单额度
   * @param orderId - 订单ID
   * @param user - 当前操作用户信息
   */
  async closeCustomerOrderCredit(orderId: string, user: JwtUserPayload) {
    const now = dayjs().toDate();
    await this.dataSource.transaction(async (manager) => {
      const flowRepo = manager.getRepository(CustomerCreditLimitDetailEntity);

      //  1. 先查流水（不加锁）
      const flow = await flowRepo.findOne({
        where: { orderId, deleted: GlobalStatusEnum.NO },
      });
      if (!flow) throw new BusinessException('订单流水不存在');
      if (flow.status === CreditStatusEnum.CLOSE) return; // 幂等
      if (flow.status !== CreditStatusEnum.FROZEN) {
        throw new BusinessException('仅【冻结中】流水允许关闭');
      }

      //  2. 更新流水状态（不加锁额度表）
      await flowRepo.update(
        { id: flow.id },
        {
          status: CreditStatusEnum.CLOSE,
          reviserId: user.userId,
          reviserName: user.nickName,
          revisedTime: now,
        },
      );

      //  3. 委托额度 Service 处理额度释放（带事务）
      await this.customerCreditLimitService.releaseCreditInTransaction(
        flow.customerId,
        flow,
        user,
        manager,
        false, // 非确认收款
      );
    });
  }
  /**
   * 确认客户订单额度
   * @param orderId 订单ID
   * @param user 当前操作用户信息
   */
  async confirmCustomerOrderCredit(orderId: string, user: JwtUserPayload) {
    await this.dataSource.transaction(async (manager) => {
      const flowRepo = manager.getRepository(CustomerCreditLimitDetailEntity);
      const flow = await flowRepo.findOne({
        where: { orderId, deleted: GlobalStatusEnum.NO },
      });
      if (!flow) throw new BusinessException('订单流水不存在');
      if (flow.status === CreditStatusEnum.FINISH) return;
      if (flow.status !== CreditStatusEnum.FROZEN) {
        throw new BusinessException('仅【冻结中】流水允许确认');
      }

      await flowRepo.update(
        { id: flow.id },
        {
          status: CreditStatusEnum.FINISH,
          reviserId: user.userId,
          reviserName: user.nickName,
          revisedTime: dayjs().toDate(),
        },
      );

      // 委托额度 Service 处理
      await this.customerCreditLimitService.releaseCreditInTransaction(
        flow.customerId,
        flow,
        user,
        manager,
        true, // 确认收款
      );
    });
  }
  /**
   * 新增客户额度流水（后续逻辑预测：把产生货补金额、使用货补金额、产生辅销金额、使用辅销金额加到客户额度中的冻结金额里面）
   */
  async addCreditDetail(
    creditParam: CreditLimitDetailRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 创建新的额度流水实体
      const creditDetail = new CustomerCreditLimitDetailEntity();
      creditDetail.customerId = creditParam.customerId;
      creditDetail.customerName = creditParam.customerName;
      creditDetail.flowCode = IdUtil.generateFlowCode();
      creditDetail.orderId = creditParam.orderId;
      creditDetail.onlineOrderId = creditParam.onlineOrderId;
      creditDetail.shippedAmount = creditParam.shippedAmount || '0';
      creditDetail.auxiliarySaleGoodsAmount =
        creditParam.auxiliarySaleGoodsAmount || '0';
      creditDetail.replenishingGoodsAmount =
        creditParam.replenishingGoodsAmount || '0';
      creditDetail.usedAuxiliarySaleGoodsAmount =
        creditParam.usedAuxiliarySaleGoodsAmount || '0';
      creditDetail.usedReplenishingGoodsAmount =
        creditParam.usedReplenishingGoodsAmount || '0';
      creditDetail.payableVoucher = creditParam.payableVoucher;
      // 默认
      creditDetail.deleted = GlobalStatusEnum.NO;
      creditDetail.status = CreditStatusEnum.FROZEN;

      // 设置创建时间
      creditDetail.creatorId = userPayload.userId;
      creditDetail.creatorName = userPayload.nickName;
      creditDetail.createdTime = dayjs().toDate();

      // 设置更新时间
      creditDetail.reviserId = userPayload.userId;
      creditDetail.reviserName = userPayload.nickName;
      creditDetail.revisedTime = dayjs().toDate();

      return await this.creditDetailRepository.save(creditDetail);
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
      const customer =
        this.customerService.getCustomerInfoCreditById(customerId);
      if (!customer) {
        throw new BusinessException('客户不存在');
      }
      // 2、事务
      return await this.dataSource.transaction(async (manager) => {
        // 2.1 获取流水详情信息
        const creditDetail = await this.getCreditDetailById(customerId);

        // 2.2 判断该流水是否可操作
        if (creditDetail?.status !== -1) {
          throw new BusinessException('该流水已处理');
        }
        // 2.3、计算并修改客户额度列表的相关金额
        await this.customerCreditLimitService.updateAuxiliaryAndReplenishingAmount(
          creditDetail,
          flag,
          manager,
        );
        // 2.4、修改流水列表的状态 1为已完成，2为已关闭
        const params = {
          status: flag ? 1 : 2,
          reviserId: user?.userId,
          reviserName: user?.nickName,
          revisedTime: new Date(),
        };
        await manager.update(
          CustomerCreditLimitDetailEntity,
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
    const creditDetail = await this.creditDetailRepository.findOneBy({
      customerId,
    });
    return creditDetail;
  }

  /**
   * 获取获取大于等于该时间的流水明细列表，根据客户id分组
   */
  async getCreditDetailListByCustomerIdAndTime(
    saveTime: Date,
  ): Promise<CreditToMonthResponseDto[]> {
    const creditDetailList = this.creditDetailRepository
      .createQueryBuilder('creditDetail')
      .select([
        'creditDetail.customer_id as customerId',
        'customer.customer_name as customerName',
        'customer.region as region',
        'SUM(creditDetail.shipped_amount) as shippedAmount',
        'SUM(creditDetail.auxiliary_sale_goods_amount) as auxiliarySaleGoodsAmount',
        'SUM(creditDetail.replenishing_goods_amount) as replenishingGoodsAmount',
        'SUM(creditDetail.used_auxiliary_sale_goods_amount) as usedAuxiliarySaleGoodsAmount',
        'SUM(creditDetail.used_replenishing_goods_amount) as usedReplenishingGoodsAmount',
      ])
      .leftJoin(
        CustomerInfoEntity,
        'customer',
        'customer.id = creditDetail.customerId',
      )
      .where('creditDetail.created_time >= :saveTime', { saveTime: saveTime })
      .andWhere('creditDetail.status = :status', { status: 1 })
      .andWhere('creditDetail.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      })
      .groupBy('creditDetail.customerId')
      .getRawMany();

    return creditDetailList;
  }

  /**
   * 把客户额度流水明细存入月度额度
   */
  async saveCreditDetailToMonth(
    { saveTime }: QueryCreditToMonthDto,
    user: JwtUserPayload,
  ): Promise<CreditToMonthResponseDto[]> {
    try {
      // 1、获取操作存入的时间(不传入就默认当天)
      const dateStr = saveTime ? saveTime : dayjs().format('YYYY-MM-DD');

      // 2、转换为 dayjs 对象进行处理
      const dateObj = dayjs(dateStr);

      // 3、格式化时间
      const newSaveTime = TimeFormatterUtil.formatToStandard(dateStr, 'start');

      // 4、提取年月信息
      const bizYear = dateObj.year(); // 例如: 2025
      const bizMonth = dateObj.month() + 1; // month() 返回 0-11，所以需要 +1
      const bizYearMonth = parseInt(dateObj.format('YYYYMM')); // 格式化为 YYMM，例如: 2510

      // 5、获取大于等于该时间的流水明细列表
      const creditDetailList =
        await this.getCreditDetailListByCustomerIdAndTime(newSaveTime);

      // 6、根据流水明细列表【客户ID+年月】以此查询月度表是否存在，不存在则新增后再修改金额
      for (const item of creditDetailList) {
        let monthlyCredit =
          await this.customerMonthlyCreditLimitService.findByCustomerIdAndMonth(
            item.customerId,
            bizYear,
            bizMonth,
          );
        // 6.1 不存在则先创建
        if (!monthlyCredit) {
          // 6.1.1 新增
          await this.customerMonthlyCreditLimitService.create(
            { ...item, bizYear, bizMonth, bizYearMonth },
            user,
          );
          // 6.1.2 重新查询获取刚创建的记录
          monthlyCredit =
            await this.customerMonthlyCreditLimitService.findByCustomerIdAndMonth(
              item.customerId,
              bizYear,
              bizMonth,
            );
        }

        // 6.2 修改累加金额 (此时 monthlyCredit 一定不为 null)
        await this.customerMonthlyCreditLimitService.updateWithIncrement(
          item,
          monthlyCredit,
          user,
        );
      }
      return creditDetailList;
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }
}
