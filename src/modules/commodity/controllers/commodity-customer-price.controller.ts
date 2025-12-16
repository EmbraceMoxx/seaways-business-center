import { Controller, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuccessResponseDto } from '@src/dto';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import {
  CommodityCustomerPriceResponseDto,
  CommodityCustomerPriceRequestDto,
  QueryCommodityCustomerOtherDto,
  QueryCommodityCustomerDto,
} from '@src/dto';
import { CurrentToken } from '@src/decorators/current-token.decorator';
import { CommodityCustomerPriceService } from '../services/commodity-customer-price.server';

@ApiTags('商品价格客户管理')
@ApiBearerAuth()
@Controller('commodity-customer-price')
export class CommodityCustomerPriceController {
  constructor(
    private commodityCustomerService: CommodityCustomerPriceService,
  ) {}

  @ApiOperation({ summary: '商品价格客户映射列表' })
  @Post('list')
  async getCommodityCustomerList(
    @Body() body: QueryCommodityCustomerDto,
    @CurrentUser() user: JwtUserPayload,
    @CurrentToken() token: string,
  ): Promise<
    SuccessResponseDto<{
      items: CommodityCustomerPriceResponseDto[];
      total: number;
    }>
  > {
    const list =
      await this.commodityCustomerService.getCommodityCustomerPriceList(
        body,
        user,
        token,
      );
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '商品价格客户映射列表' })
  @Post('list-view')
  async getCommodityCustomerPriceListOther(
    @Body() body: QueryCommodityCustomerOtherDto,
  ): Promise<
    SuccessResponseDto<{
      items: CommodityCustomerPriceResponseDto[];
      total: number;
    }>
  > {
    const list =
      await this.commodityCustomerService.getCommodityCustomerPriceListOther(
        body,
      );
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '新增商品价格客户映射' })
  @Post('create')
  async addCommodityCustomer(
    @Body() commodityCustomer: CommodityCustomerPriceRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    await this.commodityCustomerService.addCommodityCustomerPrice(
      commodityCustomer,
      user,
    );
    return new SuccessResponseDto(null, '新增成功');
  }

  @ApiOperation({ summary: '修改商品价格客户映射' })
  @Put('update/:id')
  async updateCommodityCustomer(
    @Param('id') id: string,
    @Body() commodityCustomer: CommodityCustomerPriceRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    const result =
      await this.commodityCustomerService.updateCommodityCustomerPrice(
        id,
        commodityCustomer,
        user,
      );
    return new SuccessResponseDto(result, '修改成功');
  }

  @ApiOperation({ summary: '删除商品价格客户映射' })
  @Delete('delete/:id')
  async deleteCommodityCustomer(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    const result =
      await this.commodityCustomerService.deleteCustomerCommodityPrices(
        id,
        user,
      );
    return new SuccessResponseDto(result, '删除成功');
  }
}
