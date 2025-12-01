import { Controller, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
} from '@src/dto';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';
import { BusinessException } from '@src/dto/common/common.dto';
import * as exceljs from 'exceljs';
import { generateSafeFileName } from '@src/utils/exportDataToExcel';
import { MoneyUtil } from '@utils/MoneyUtil';

@ApiTags('客户额度')
@ApiBearerAuth()
@Controller('customer/credit')
export class CustomerCreditLimitController {
  constructor(private CreditLimitService: CustomerCreditLimitService) {}

  @ApiOperation({ summary: '获取客户额度列表' })
  @Post('list')
  async getCreditPageList(
    @Body() body: QueryCreditLimitDto,
  ): Promise<SuccessResponseDto<CreditLimitListResponseDto>> {
    const list = await this.CreditLimitService.getCreditPageList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '客户额度列表导出' })
  @Post('export')
  async exportToExcel(@Res() res, @Body() query: QueryCreditLimitDto) {
    try {
      // 1、创建工作簿
      const workbook = new exceljs.Workbook();
      // 2、创建工作表
      const worksheet = workbook.addWorksheet('客户额度信息');
      // 3、设置列标题
      worksheet.columns = [
        { header: '客户名称', key: 'customerName', width: 36 },
        { header: '所在区域', key: 'region', width: 15 },
        { header: '累计发货金额', key: 'shippedAmount', width: 20 },
        {
          header: '冻结发货金额',
          key: 'frozenShippedAmount',
          width: 25,
        },
        {
          header: '辅销金额',
          key: 'auxiliarySaleGoodsAmount',
          width: 20,
        },
        {
          header: '已提辅销金额',
          key: 'usedAuxiliarySaleGoodsAmount',
          width: 20,
        },
        {
          header: '冻结产生辅销金额',
          key: 'frozenSaleGoodsAmount',
          width: 25,
        },
        {
          header: '冻结使用辅销金额',
          key: 'frozenUsedSaleGoodsAmount',
          width: 25,
        },
        {
          header: '剩余辅销金额',
          key: 'remainAuxiliarySaleGoodsAmount',
          width: 20,
        },
        {
          header: '货补金额',
          key: 'replenishingGoodsAmount',
          width: 15,
        },

        {
          header: '已提货补金额',
          key: 'usedReplenishingGoodsAmount',
          width: 20,
        },
        {
          header: '冻结产生货补金额',
          key: 'frozenReplenishingGoodsAmount',
          width: 25,
        },
        {
          header: '冻结使用货补金额',
          key: 'frozenUsedReplenishingGoodsAmount',
          width: 25,
        },
        {
          header: '剩余货补金额',
          key: 'remainReplenishingGoodsAmount',
          width: 20,
        },
      ];
      // 4、获取数据
      const creditExportList =
        await this.CreditLimitService.exportCreditInfoList(query);

      // 5、添加数据行
      for (const item of creditExportList) {
        worksheet.addRow(
          {
            ...item,
            shippedAmount: MoneyUtil.fromYuan(item.shippedAmount).toYuan(),
            frozenShippedAmount: MoneyUtil.fromYuan(
              item.frozenShippedAmount,
            ).toYuan(),
            auxiliarySaleGoodsAmount: MoneyUtil.fromYuan(
              item.auxiliarySaleGoodsAmount,
            ).toYuan(),
            usedAuxiliarySaleGoodsAmount: MoneyUtil.fromYuan(
              item.usedAuxiliarySaleGoodsAmount,
            ).toYuan(),
            frozenSaleGoodsAmount: MoneyUtil.fromYuan(
              item.frozenSaleGoodsAmount,
            ).toYuan(),
            frozenUsedSaleGoodsAmount: MoneyUtil.fromYuan(
              item.frozenUsedSaleGoodsAmount,
            ).toYuan(),
            remainAuxiliarySaleGoodsAmount: MoneyUtil.fromYuan(
              item.remainAuxiliarySaleGoodsAmount,
            ).toYuan(),
            replenishingGoodsAmount: MoneyUtil.fromYuan(
              item.replenishingGoodsAmount,
            ).toYuan(),
            usedReplenishingGoodsAmount: MoneyUtil.fromYuan(
              item.usedReplenishingGoodsAmount,
            ).toYuan(),
            frozenReplenishingGoodsAmount: MoneyUtil.fromYuan(
              item.frozenReplenishingGoodsAmount,
            ).toYuan(),
            frozenUsedReplenishingGoodsAmount: MoneyUtil.fromYuan(
              item.frozenUsedReplenishingGoodsAmount,
            ).toYuan(),
            remainReplenishingGoodsAmount: MoneyUtil.fromYuan(
              item.remainReplenishingGoodsAmount,
            ).toYuan(),
          },
          'n',
        );
      }
      // 6、设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      // 7、设置文件名
      const fileName = generateSafeFileName('Customer_Credit', 'xlsx');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      // 8、导出数据
      await workbook.xlsx.write(res);
      // 9、结束响应
      res.end();
    } catch (error) {
      throw new BusinessException('客户额度列表导出失败');
    }
  }
}
