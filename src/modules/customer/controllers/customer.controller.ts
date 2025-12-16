import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCustomerDto,
  CustomerInfoResponseDto,
  CustomerRequestDto,
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
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<
    SuccessResponseDto<{ items: CustomerInfoResponseDto[]; total: number }>
  > {
    const list = await this.customerService.getCustomerList(body, user, token);
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
  @Get('detail/:id')
  async getCustomerInfo(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    const commodity = await this.customerService.getCustomerInfoCreditById(id);
    return new SuccessResponseDto(commodity);
  }

  @ApiOperation({ summary: '更新客户信息' })
  @Put('update/:id')
  async updateCustomerInfo(
    @Param('id') id: string,
    @Body() cstomerInfo: CustomerRequestDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    await this.customerService.updateCustomerInfo(id, cstomerInfo, user, token);
    return new SuccessResponseDto(null, '更新成功');
  }

  @ApiOperation({ summary: '新增客户' })
  @Post('create')
  async addCustomer(
    @Body() cstomerInfo: CustomerRequestDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    await this.customerService.addCustomer(cstomerInfo, user, token);
    return new SuccessResponseDto(null, '新增成功');
  }

  @ApiOperation({ summary: '删除客户' })
  @Delete('delete/:id')
  async deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto<CustomerInfoResponseDto>> {
    await this.customerService.deleteCustomer(id, user);
    return new SuccessResponseDto(null, '删除成功');
  }
}
