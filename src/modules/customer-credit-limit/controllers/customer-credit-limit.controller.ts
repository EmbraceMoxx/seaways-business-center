import {
  Controller,
  Post,
  Get,
  Body,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';
import {
  SuccessResponseDto,
  QueryCreditLimitDto,
  CreditLimitListResponseDto,
  CustomerInfoResponseDto,
} from '@src/dto';

@ApiTags('客户额度')
@ApiBearerAuth()
@Controller('customerCreditLimit')
export class CustomerCreditLimitController {
  constructor(private CreditLimitService: CustomerCreditLimitService) {}

  @ApiOperation({ summary: '获取客户额度列表' })
  @Post('list')
  async getCommodityList(
    @Body() body: QueryCreditLimitDto,
  ): Promise<SuccessResponseDto<CreditLimitListResponseDto>> {
    const list = await this.CreditLimitService.getCreditPageList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取客户详情' })
  @Get('customerInfo/:id')
  async getCustomerInfo(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    const commodity = await this.CreditLimitService.getCustomerInfoById(id);
    return new SuccessResponseDto(commodity);
  }
}
