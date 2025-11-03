import { Controller, Post, Get, Body, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommodityCategoryService } from './commodity-category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuccessResponseDto, BusinessException } from '@src/dto';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';

@ApiTags('商品分类管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commodity-category')
export class CommodityCategoryController {
  constructor(private authRoleService: CommodityCategoryService) {}
}
