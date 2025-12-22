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
import { CurrentToken } from '@src/decorators/current-token.decorator';

@ApiTags('客户额度流水明细')
@ApiBearerAuth()
@Controller('customer/credit/detail')
export class CustomerCreditLimitDetailController {
  constructor(
    private creditLimitDetailService: CustomerCreditLimitDetailService,
  ) {}

  @ApiOperation({ summary: '获取客户额度流水明细列表' })
  @Post('list')
  async getCreditDetailPageList(
    @Body() body: QueryCreditLimiDetailtDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<
    SuccessResponseDto<{ items: CreditLimitDetailResponseDto[]; total: number }>
  > {
    const list = await this.creditLimitDetailService.getCreditDetailPageList(
      body,
      user,
      token,
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

  @ApiOperation({ summary: '客户额度流水明细存入【月度】额度' })
  @Get('sync-month')
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

  @ApiOperation({ summary: '客户额度流水明细存入【日度】额度' })
  @Get('sync-daily')
  async saveCreditDetailToDaily(
    @Query() params: any,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.creditLimitDetailService.saveCreditDetailToDaily(
      params,
      user,
    );
    return new SuccessResponseDto(result, '存入成功');
  }
}
