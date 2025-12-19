import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerDailyCreditAmountInfoEntity } from '../entities/customer-daily-credit-amount-info.entity';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as exceljs from 'exceljs';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { forwardRef, Inject } from '@nestjs/common';
import { CustomerService } from '@modules/customer/services/customer.service';
import { UserService } from '@modules/common/user/user.service';
import { MoneyUtil } from '@utils/MoneyUtil';
import { ExportQueryCreditLimitDto } from '@src/dto';

@Injectable()
export class CustomerDailyCreditAmountInfoService {
  constructor(
    @InjectRepository(CustomerDailyCreditAmountInfoEntity)
    private customerDailyCreditRepository: Repository<CustomerDailyCreditAmountInfoEntity>,
    private userService: UserService,
    @Inject(forwardRef(() => CustomerService))
    private customerService: CustomerService,
  ) {}

  /**
   * 导出表格的配置
   */
  async exportToDailyExcelConfig(params: {
    query: ExportQueryCreditLimitDto;
    user: JwtUserPayload;
    token: string;
  }) {
    const { query, user, token } = params;
    // 1、创建工作簿
    const workbook = new exceljs.Workbook();
    // 2、创建工作表
    const worksheet = workbook.addWorksheet('客户日度额度信息');
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
        header: '统计年月日',
        key: 'bizYearMonthDay',
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
    const dailyExportList = await this.getExportDailyCreditList(
      query,
      user,
      token,
    );

    // 6、添加数据行
    for (const item of dailyExportList) {
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
   * 获取导出的客户【日度】额度列表
   * @param query 查询参数
   * @param user
   * @param token
   * @returns 客户【日度】额度列表
   */
  async getExportDailyCreditList(
    query: ExportQueryCreditLimitDto,
    user: JwtUserPayload,
    token: string,
  ) {
    const { customerName, region, startTime, endTime } = query;
    // 1、创建查询条件
    let queryBuilder = this.customerDailyCreditRepository
      .createQueryBuilder('daily')
      .where('daily.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      });

    // 客户名称
    if (customerName) {
      queryBuilder = queryBuilder.andWhere(
        'daily.customer_name LIKE :customerName',
        {
          customerName: `%${customerName}%`,
        },
      );
    }

    // 客户所属区域
    if (region) {
      queryBuilder = queryBuilder.andWhere('daily.region = :region', {
        region,
      });
    }

    // 统计年月日查询
    if (startTime && endTime) {
      queryBuilder = queryBuilder.andWhere(
        'daily.biz_year_month_day BETWEEN :startTime AND :endTime',
        {
          startTime: Number(startTime),
          endTime: Number(endTime),
        },
      );
    } else if (startTime) {
      queryBuilder = queryBuilder.andWhere(
        'daily.biz_year_month_day >= :startTime',
        {
          startTime: Number(startTime),
        },
      );
    } else if (endTime) {
      queryBuilder = queryBuilder.andWhere(
        'daily.biz_year_month_day <= :endTime',
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
        'daily.customer_id IN (:customerIds)',
        { customerIds },
      );
    }

    queryBuilder = queryBuilder.orderBy({
      'daily.created_time': 'DESC',
      'daily.customer_id': 'DESC',
      'daily.biz_year_month_day': 'DESC',
    });

    // 4、获取数据
    return await queryBuilder.getMany();
  }
}
