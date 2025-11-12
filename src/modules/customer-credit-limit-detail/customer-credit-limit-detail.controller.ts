import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerCreditLimitDetailService } from './customer-credit-limit-detail.service';
import {
  SuccessResponseDto,
  QueryCreditLimiDetailtDto,
  CreditLimitDetailResponseDto,
} from '@src/dto';

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
}
