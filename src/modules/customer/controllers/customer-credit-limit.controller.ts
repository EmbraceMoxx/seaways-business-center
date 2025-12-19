import { Controller, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
  ExportQueryCreditLimitDto,
} from '@src/dto';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';
import { BusinessException } from '@src/dto/common/common.dto';
import { generateSafeFileName } from '@src/utils/exportDataToExcel';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { CurrentToken } from '@src/decorators/current-token.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CustomerMonthlyCreditLimitService } from '@modules/customer/services/customer-monthly-credit-limit.server';
import { CustomerDailyCreditAmountInfoService } from '@modules/customer/services/customer-daily-credit-amount-info.server';

@ApiTags('客户额度')
@ApiBearerAuth()
@Controller('customer/credit')
export class CustomerCreditLimitController {
  constructor(
    private creditLimitService: CustomerCreditLimitService,
    private customerMonthlyCreditLimitService: CustomerMonthlyCreditLimitService,
    private customerDailyCreditAmountInfoService: CustomerDailyCreditAmountInfoService,
  ) {}

  @ApiOperation({ summary: '获取客户额度列表' })
  @Post('list')
  async getCreditPageList(
    @Body() body: QueryCreditLimitDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<SuccessResponseDto<CreditLimitListResponseDto>> {
    const list = await this.creditLimitService.getCreditPageList(
      body,
      user,
      token,
    );
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '客户额度列表导出' })
  @Post('export')
  async exportToExcel(
    @Res() res,
    @Body() query: ExportQueryCreditLimitDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ) {
    try {
      const { exportType } = query;
      // 1、设置传参
      const params = {
        query,
        user,
        token,
      };

      // 2、根据导出类型(1--日度、2--月度、3--累计)调用对应方法
      let workbook = null;
      if (exportType === '1') {
        // 校验是否传时间
        if (!query.startTime || !query.endTime) {
          throw new BusinessException('请选择开始时间和结束时间');
        }

        // 校验为8位数的字符串
        const checkTime = (time) => {
          const reg = /^\d{8}$/;
          return reg.test(time);
        };

        if (!checkTime(query.startTime) || !checkTime(query.endTime)) {
          throw new BusinessException('请选择正确的时间格式，例如20250101');
        }
        // 日度
        workbook =
          await this.customerDailyCreditAmountInfoService.exportToDailyExcelConfig(
            params,
          );
      } else if (exportType === '2') {
        // 校验是否传时间
        if (!query.startTime || !query.endTime) {
          throw new BusinessException('请选择开始时间和结束时间');
        }

        // 校验为8位数的字符串
        const checkTime = (time) => {
          const reg = /^\d{6}$/;
          return reg.test(time);
        };

        if (!checkTime(query.startTime) || !checkTime(query.endTime)) {
          throw new BusinessException('请选择正确的时间格式，例如202501');
        }
        // 月度
        workbook =
          await this.customerMonthlyCreditLimitService.exportToMonthlyExcelConfig(
            params,
          );
      } else if (exportType === '3') {
        // 累计
        workbook = await this.creditLimitService.exportToTotalExcelConfig(
          params,
        );
      }

      // 3、设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // 4、设置文件名
      const excelTitle = {
        '1': 'Daily_Credit_Export',
        '2': 'Monthly_Credit_Export',
        '3': 'Total_Credit_Export',
      };
      const fileName = generateSafeFileName(excelTitle[exportType], 'xlsx');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      // 5、导出数据
      await workbook?.xlsx?.write(res);
      // 6、结束响应
      res.end();
    } catch (error) {
      throw new BusinessException(error?.message);
    }
  }
}
