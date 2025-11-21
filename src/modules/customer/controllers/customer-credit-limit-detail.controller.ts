import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCreditLimiDetailtDto,
  CreditLimitDetailResponseDto,
  CreditLimitDetailRequestDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { CustomerCreditLimitDetailService } from '../services/customer-credit-limit-detail.service';

@ApiTags('客户额度流水明细')
@ApiBearerAuth()
@Controller('customerCreditLimitDetail')
export class CustomerCreditLimitDetailController {
  constructor(
    private creditLimitDetailService: CustomerCreditLimitDetailService,
  ) {}

  @ApiOperation({ summary: '获取客户额度流水明细列表' })
  @Post('list')
  async getCreditDetailPageList(
    @Body() body: QueryCreditLimiDetailtDto,
  ): Promise<
    SuccessResponseDto<{ items: CreditLimitDetailResponseDto[]; total: number }>
  > {
    const list = await this.creditLimitDetailService.getCreditDetailPageList(
      body,
    );
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '新增客户额度流水明细' })
  @Post('create')
  async addCreditDetail(
    @Body() body: CreditLimitDetailRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.creditLimitDetailService.addCustomerOrderCredit(body, user);
    return new SuccessResponseDto(null, '新增成功');
  }

  @ApiOperation({ summary: '确认收款' })
  @Post('confirmReceipt')
  async confirmReceipt(
    @Body('customerId') customerId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    await this.creditLimitDetailService.onReceipt(true, customerId, user);
    return new SuccessResponseDto(null, '确认收款成功');
  }

  @ApiOperation({ summary: '取消订单' })
  @Post('cancelOrder')
  async cancelOrder(
    @Body('customerId') customerId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    await this.creditLimitDetailService.onReceipt(false, customerId, user);
    return new SuccessResponseDto(null, '取消订单成功');
  }

  @ApiOperation({ summary: '客户额度流水明细存入月度额度' })
  @Get('saveToMonth')
  async saveCreditDetailToMonth(
    @Query() params: any,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.creditLimitDetailService.saveCreditDetailToMonth(
      params,
      user,
    );
    return new SuccessResponseDto(result, '存入成功');
  }
}
