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
import { CommodityService } from '../services/commodity.service';
import {
  SuccessResponseDto,
  QueryCommodityDto,
  CommodityResponseDto,
} from '@src/dto';

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
    const list = await this.commodityService.getcommodityPageList(body);
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取商品详情' })
  @Get('commodityInfo/:id')
  async getCommodityDetail(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<CommodityResponseDto>> {
    const commodity = await this.commodityService.getCommodityById(id);
    return new SuccessResponseDto(commodity);
  }
}
