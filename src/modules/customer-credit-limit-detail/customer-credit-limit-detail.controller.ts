import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerCreditLimitDetailService } from './customer-credit-limit-detail.service';
import {
  SuccessResponseDto,
  QueryCreditLimiDetailtDto,
  CreditLimitDetailResponseDto,
  CreditLimitDetailRequestDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CurrentUser } from '@src/decorators/current-user.decorator';

@ApiTags('客户额度流水明细')
@ApiBearerAuth()
@Controller('customerCreditLimitDetail')
export class CustomerCreditLimitDetailController {
  constructor(
    private CreditLimitDetailService: CustomerCreditLimitDetailService,
  ) {}

  @ApiOperation({ summary: '获取客户额度流水明细列表' })
  @Post('list')
  async getCommodityList(
    @Body() body: QueryCreditLimiDetailtDto,
  ): Promise<
    SuccessResponseDto<{ items: CreditLimitDetailResponseDto[]; total: number }>
  > {
    const list = await this.CreditLimitDetailService.getCreditDetailPageList(
      body,
    );
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '新增客户额度流水明细' })
  @Post('create')
  async addCommodity(
    @Body() body: CreditLimitDetailRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.CreditLimitDetailService.addCommodity(body, user);
    return new SuccessResponseDto(null, '新增成功');
  }

  @ApiOperation({ summary: '确认收款' })
  @Post('confirmReceipt')
  async confirmReceipt(
    @Body('customerId') customerId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    await this.CreditLimitDetailService.onReceipt(false, customerId, user);
    return new SuccessResponseDto(null, '确认收款成功');
  }

  @ApiOperation({ summary: '取消订单' })
  @Post('cancelOrder')
  async cancelOrder(
    @Body('customerId') customerId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    await this.CreditLimitDetailService.onReceipt(true, customerId, user);
    return new SuccessResponseDto(null, '取消订单成功');
  }
}
