import { Controller, Post, Body, Param, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCustomerDto,
  CustomerInfoResponseDto,
  CustomerInfoUpdateDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { CustomerService } from '../services/customer.service';
import { CurrentToken } from '@src/decorators/current-token.decorator';

@ApiTags('客户管理')
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @ApiOperation({ summary: '获取客户列表' })
  @Post('list')
  async getCustomerList(
    @Body() body: QueryCustomerDto,
  ): Promise<
    SuccessResponseDto<{ items: CustomerInfoResponseDto[]; total: number }>
  > {
    const list = await this.customerService.getCustomerList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取选择客户列表' })
  @Post('selectList')
  async getSelectCustomerList(
    @Body() body: QueryCustomerDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<
    SuccessResponseDto<{ items: CustomerInfoResponseDto[]; total: number }>
  > {
    const list = await this.customerService.getSelectCustomerList(
      body,
      user,
      token,
    );
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取客户详情' })
  @Get('customerInfo/:id')
  async getCustomerInfo(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    const commodity = await this.customerService.getCustomerInfoCreditById(id);
    return new SuccessResponseDto(commodity);
  }

  @ApiOperation({ summary: '更新客户信息' })
  @Put('updateCustomerInfo/:id')
  async updateCustomerInfo(
    @Param('id') id: string,
    @Body() cstomerInfo: CustomerInfoUpdateDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    await this.customerService.updateCustomerInfo(id, cstomerInfo, user, token);
    return new SuccessResponseDto(null, '更新成功');
  }
}
