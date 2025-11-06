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
import { CommodityCategoryService } from './commodity-category.service';
import { SuccessResponseDto } from '@src/dto';
import { CurrentUser } from '@src/decorators/current-user.decorator';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CategoryRequestDto } from '@src/dto';
import { CommodityCategoryEntity } from './commodity-category.entity';

@ApiTags('商品分类管理')
@ApiBearerAuth()
@Controller('commodity-category')
export class CommodityCategoryController {
  constructor(private categoryService: CommodityCategoryService) {}

  @ApiOperation({ summary: '获取商品分类列表' })
  @Post('list-tree')
  async getCategoryList(): Promise<
    SuccessResponseDto<CommodityCategoryEntity[]>
  > {
    const list = await this.categoryService.getCategoryListTree();
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '获取商品分类下拉树形列表' })
  @Get('list-tree-select')
  async getCategoryListTreeSelect(): Promise<
    SuccessResponseDto<CommodityCategoryEntity[]>
  > {
    const list = await this.categoryService.getCategorySelectTree();
    return new SuccessResponseDto(list);
  }

  @ApiOperation({ summary: '新增商品分类' })
  @Post('create')
  async addCategory(
    @Body() category: CategoryRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    const result = await this.categoryService.addCategory(category, user);
    return new SuccessResponseDto(result, '新增成功');
  }

  @ApiOperation({ summary: '修改商品分类' })
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() category: CategoryRequestDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SuccessResponseDto> {
    const result = await this.categoryService.updateCategory(
      id,
      category,
      user,
    );
    return new SuccessResponseDto(result, '修改成功');
  }

  @ApiOperation({ summary: '删除商品分类' })
  @Delete(':id')
  async deleteCategory(@Param('id') id: string): Promise<SuccessResponseDto> {
    const result = await this.categoryService.deleteCategory(id);
    return new SuccessResponseDto(result, '删除成功');
  }
}
