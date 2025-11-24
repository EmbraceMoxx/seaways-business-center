import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCustomerAddressDto,
  CustomerAddressResponseDto,
  CustomerAddressRequestDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { CustomerAddressService } from '../services/customer-address.service';

@ApiTags('客户地址管理')
@ApiBearerAuth()
@Controller('customerAddress')
export class CustomerAddressController {
  constructor(private customerAddressService: CustomerAddressService) {}

  @ApiOperation({ summary: '获取客户地址列表' })
  @Post('list')
  async getCustomerAddressList(
    @Body() body: QueryCustomerAddressDto,
  ): Promise<SuccessResponseDto<CustomerAddressResponseDto[]>> {
    const list = await this.customerAddressService.getCustomerAddressPageList(
      body,
    );
    return new SuccessResponseDto(list, '获取客户地址列表成功');
  }

  @ApiOperation({ summary: '新增客户地址' })
  @Post('create')
  async addCustomerAddress(
    @Body() body: CustomerAddressRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.customerAddressService.addCustomerAddress(body, user);
    return new SuccessResponseDto(null, '新增成功');
  }

  @ApiOperation({ summary: '更新客户地址' })
  @Put(':id')
  async updatCustomerAddress(
    @Param('id') id: string,
    @Body() customerAddress: CustomerAddressRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    await this.customerAddressService.updatCustomerAddress(
      id,
      customerAddress,
      user,
    );
    return new SuccessResponseDto(null, '更新成功');
  }

  @ApiOperation({ summary: '删除客户地址' })
  @Delete(':id')
  async deleteCustomerAddress(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto> {
    const result = await this.customerAddressService.deleteCustomerAddress(id);
    return new SuccessResponseDto(result, '删除成功');
  }

  @ApiOperation({ summary: '获取客户地址信息' })
  @Get('addressInfo/:id')
  async getCustomerAddressInfo(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto> {
    const result = await this.customerAddressService.getCustomerAddressInfo(id);
    return new SuccessResponseDto(result, '获取地址信息成功');
  }
}
