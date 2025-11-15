import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAddressService } from './customer-address.service';
import {
  SuccessResponseDto,
  QueryCustomerAddresstDto,
  CustomerAddressResponseDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CurrentUser } from '@src/decorators/current-user.decorator';

@ApiTags('客户地址管理')
@ApiBearerAuth()
@Controller('customerAddress')
export class CustomerAddressController {
  constructor(private customerAddressService: CustomerAddressService) {}

  @ApiOperation({ summary: '获取客户地址列表' })
  @Post('list')
  async getCustomerAddressList(
    @Body() body: QueryCustomerAddresstDto,
  ): Promise<
    SuccessResponseDto<{ items: CustomerAddressResponseDto[]; total: number }>
  > {
    const list = await this.customerAddressService.getCustomerAddressPageList(
      body,
    );
    return new SuccessResponseDto(list, '获取客户地址列表成功');
  }
}
