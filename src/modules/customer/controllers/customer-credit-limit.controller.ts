import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
} from '@src/dto';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';

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
}
