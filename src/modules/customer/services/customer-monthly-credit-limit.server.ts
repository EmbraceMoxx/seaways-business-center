import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { UserService } from '@modules/common/user/user.service';
import { CustomerMonthlyCreditLimitEntity } from '../entities/customer-monthly-credit-limit.entity';
import { MoneyUtil } from '@utils/MoneyUtil';
import * as exceljs from 'exceljs';
import {
  CreditLimitStatisticsResponseDto,
  QueryMonthlyCreditDto,
  CreditToMonthResponseDto,
} from '@src/dto';
import { forwardRef, Inject } from '@nestjs/common';
import { CustomerService } from '@modules/customer/services/customer.service';
import { ExportQueryCreditLimitDto } from '@src/dto';

@Injectable()
export class CustomerMonthlyCreditLimitService {
  constructor(
    @InjectRepository(CustomerMonthlyCreditLimitEntity)
    private customerMonthlyCreditRepository: Repository<CustomerMonthlyCreditLimitEntity>,
    private userService: UserService,
    @Inject(forwardRef(() => CustomerService))
    private customerService: CustomerService,
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

  /**
   * 导出表格的配置
   */
  async exportToMonthlyExcelConfig(params: {
    query: ExportQueryCreditLimitDto;
    user: JwtUserPayload;
    token: string;
  }) {
    const { query, user, token } = params;
    // 1、创建工作簿
    const workbook = new exceljs.Workbook();
    // 2、创建工作表
    const worksheet = workbook.addWorksheet('客户月度额度信息');
    // 3、局中配置
    const alignment: Partial<exceljs.Alignment> = {
      vertical: 'middle',
      horizontal: 'center',
    };
    // 4、设置列标题
    worksheet.columns = [
      { header: '客户名称', key: 'customerName', width: 40 },
      {
        header: '所在区域',
        key: 'region',
        width: 15,
        style: {
          alignment,
        },
      },
      {
        header: '统计年月',
        key: 'bizYearMonth',
        width: 20,
        style: {
          alignment,
        },
      },
      {
        header: '合同任务金额',
        key: 'contractMissionAmount',
        width: 15,
      },
      {
        header: '发货金额',
        key: 'shippedAmount',
        width: 15,
      },
      {
        header: '回款金额',
        key: 'repaymentAmount',
        width: 15,
      },
      {
        header: '3%辅销品金额',
        key: 'auxiliarySaleGoodsAmount',
        width: 15,
      },
      {
        header: '10%货补金额',
        key: 'replenishingGoodsAmount',
        width: 15,
      },

      {
        header: '已提辅销金额',
        key: 'usedAuxiliarySaleGoodsAmount',
        width: 15,
      },
      {
        header: '剩余辅销金额',
        key: 'remainAuxiliarySaleGoodsAmount',
        width: 15,
      },
      {
        header: '已提货补金额',
        key: 'usedReplenishingGoodsAmount',
        width: 15,
      },
      {
        header: '剩余货补金额',
        key: 'remainReplenishingGoodsAmount',
        width: 15,
      },
    ];
    // 5、获取数据
    const monthlyExportList = await this.getExportMonthlyCreditList(
      query,
      user,
      token,
    );

    // 6、添加数据行
    for (const item of monthlyExportList) {
      worksheet.addRow(
        {
          ...item,
          shippedAmount: MoneyUtil.fromYuan3(item.shippedAmount).toYuan3(),
          auxiliarySaleGoodsAmount: MoneyUtil.fromYuan3(
            item.auxiliarySaleGoodsAmount,
          ).toYuan3(),
          usedAuxiliarySaleGoodsAmount: MoneyUtil.fromYuan3(
            item.usedAuxiliarySaleGoodsAmount,
          ).toYuan3(),
          remainAuxiliarySaleGoodsAmount: MoneyUtil.fromYuan3(
            item.remainAuxiliarySaleGoodsAmount,
          ).toYuan3(),
          replenishingGoodsAmount: MoneyUtil.fromYuan3(
            item.replenishingGoodsAmount,
          ).toYuan3(),
          usedReplenishingGoodsAmount: MoneyUtil.fromYuan3(
            item.usedReplenishingGoodsAmount,
          ).toYuan3(),
          remainReplenishingGoodsAmount: MoneyUtil.fromYuan3(
            item.remainReplenishingGoodsAmount,
          ).toYuan3(),
        },
        'n',
      );
    }

    // 7、返回工作簿
    return workbook;
  }

  /**
   * 获取导出的客户【月度】额度列表
   * @param query 查询参数
   * @param user
   * @param token
   * @returns 客户【月度】额度列表
   */
  async getExportMonthlyCreditList(
    query: ExportQueryCreditLimitDto,
    user: JwtUserPayload,
    token: string,
  ) {
    const { customerName, region, startTime, endTime } = query;
    // 1、创建查询条件
    let queryBuilder = this.customerMonthlyCreditRepository
      .createQueryBuilder('monthly')
      .where('monthly.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      });

    // 客户名称
    if (customerName) {
      queryBuilder = queryBuilder.andWhere(
        'monthly.customer_name LIKE :customerName',
        {
          customerName: `%${customerName}%`,
        },
      );
    }

    // 客户所属区域
    if (region) {
      queryBuilder = queryBuilder.andWhere('monthly.region = :region', {
        region,
      });
    }

    // 统计年月查询

    if (startTime && endTime) {
      queryBuilder = queryBuilder.andWhere(
        'monthly.biz_year_month BETWEEN :startTime AND :endTime',
        {
          startTime: Number(startTime),
          endTime: Number(endTime),
        },
      );
    } else if (startTime) {
      queryBuilder = queryBuilder.andWhere(
        'monthly.biz_year_month >= :startTime',
        {
          startTime: Number(startTime),
        },
      );
    } else if (endTime) {
      queryBuilder = queryBuilder.andWhere(
        'monthly.biz_year_month <= :endTime',
        {
          endTime: Number(endTime),
        },
      );
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
        'monthly.customer_id IN (:customerIds)',
        { customerIds },
      );
    }

    queryBuilder = queryBuilder.orderBy({
      'monthly.created_time': 'DESC',
      'monthly.customer_id': 'DESC',
      'monthly.biz_year_month': 'DESC',
    });

    // 4、获取数据
    return await queryBuilder.getMany();
  }
}
