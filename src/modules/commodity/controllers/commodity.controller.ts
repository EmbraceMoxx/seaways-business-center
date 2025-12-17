import { Controller, Post, Get, Body, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  QueryCommodityDto,
  CommodityResponseDto,
  CommodityRequestDto,
} from '@src/dto';
import { CommodityService } from '../services/commodity.service';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';

@ApiTags('商品管理')
@ApiBearerAuth()
@Controller('commodity')
export class CommodityController {
  constructor(private commodityService: CommodityService) {}

  @ApiOperation({ summary: '获取商品列表' })
  @Post('list')
  async getCommodityList(
    @Body() body: QueryCommodityDto,
  ): Promise<
    SuccessResponseDto<{ items: CommodityResponseDto[]; total: number }>
  > {
    const list = await this.commodityService.getCommodityPageList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取选择商品列表' })
  @Post('select-list')
  async getSelectCommodityList(
    @Body() body: QueryCommodityDto,
  ): Promise<
    SuccessResponseDto<{ items: CommodityResponseDto[]; total: number }>
  > {
    const list = await this.commodityService.getSelectCommodityPageList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取选择商品列表-不分页' })
  @Post('select-list-common')
  async getCommomCommodityList(
    @Body() body: QueryCommodityDto,
  ): Promise<SuccessResponseDto<CommodityResponseDto[]>> {
    const list = await this.commodityService.getSelectCommodityList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取商品详情' })
  @Get('detail/:id')
  async getCommodityDetail(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<CommodityResponseDto>> {
    const commodity = await this.commodityService.getCommodityById(id);
    return new SuccessResponseDto(commodity);
  }

  @ApiOperation({ summary: '新增商品' })
  @Post('create')
  async addCommodity(
    @Body() commodity: CommodityRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    const result = await this.commodityService.addCommodity(commodity, user);
    return new SuccessResponseDto(result, '新增成功');
  }

  @ApiOperation({ summary: '更新商品' })
  @Put(':id')
  async updateCommodity(
    @Param('id') id: string,
    @Body() commodity: CommodityRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    const result = await this.commodityService.updateCommodity(
      id,
      commodity,
      user,
    );
    return new SuccessResponseDto(result, '新增成功');
  }
}
