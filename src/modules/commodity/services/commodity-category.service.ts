import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  CategoryRequestDto,
  CategoryResponseDto,
  CategorySelecRequestDto,
} from '@src/dto';
import { generateId } from '@src/utils';
import { Not } from 'typeorm';
import { CommodityCategoryEntity } from '../entities/commodity-category.entity';
import { CommodityService } from './commodity.service';

@Injectable()
export class CommodityCategoryService {
  constructor(
    @InjectRepository(CommodityCategoryEntity)
    private categoryRepository: Repository<CommodityCategoryEntity>,

    @Inject(forwardRef(() => CommodityService))
    private commodityService: CommodityService,
  ) {}

  /**
   * 获取商品分类列表-树状（未删除）
   */
  async getCategoryListTree(): Promise<CommodityCategoryEntity[]> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      })
      .orderBy('category.created_time', 'DESC');

    const categoryList = await queryBuilder.getMany();

    return await this.buildCategoryTree(categoryList);
  }

  /**
   * 商品分类下拉选择列表-树状（未删除且启用）
   */
  async getCategorySelectTree(params: CategorySelecRequestDto): Promise<any[]> {
    const { parentId, categoryLevel } = params;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      })
      .andWhere('category.enabled = :enabled', {
        enabled: GlobalStatusEnum.YES,
      })
      .orderBy('category.created_time', 'DESC');

    // 父级id
    if (parentId) {
      queryBuilder.andWhere('category.parent_id = :parentId', {
        parentId,
      });
    }

    // 分类级别
    if (categoryLevel) {
      queryBuilder.andWhere('category.category_level = :categoryLevel', {
        categoryLevel,
      });
    }

    const categoryList = await queryBuilder.getMany();
    const tree = await this.buildCategoryTree(categoryList);

    // 转换为下拉选择所需格式
    const convertToSelectFormat = (
      categories: CommodityCategoryEntity[],
    ): any[] => {
      return categories.map((category) => {
        const result: any = {
          label: category.categoryName,
          value: category.id,
        };

        // 只有当存在子节点时才添加children属性
        if (category.children && category.children.length > 0) {
          result.children = convertToSelectFormat(category.children);
        }

        return result;
      });
    };

    return convertToSelectFormat(tree);
  }

  /**
   * 根据id查询商品分类
   */
  async getCategoryById(id: string): Promise<CommodityCategoryEntity> {
    return await this.categoryRepository.findOne({
      where: {
        id,
        deleted: GlobalStatusEnum.NO,
      },
    });
  }

  /**
   * 根据名称查询商品分类
   */
  async getCategoryByName(categoryName: string): Promise<CategoryResponseDto> {
    return await this.categoryRepository.findOne({
      where: {
        categoryName,
        deleted: GlobalStatusEnum.NO,
      },
    });
  }

  /**
   * 新增商品分类
   */
  async addCategory(
    categoryData: CategoryRequestDto,
    user: JwtUserPayload,
  ): Promise<CommodityCategoryEntity> {
    try {
      const {
        parentId,
        categoryName,
        description,
        sortOrder,
        enabled,
        categoryCode,
      } = categoryData;
      const category = new CommodityCategoryEntity();

      // 1、初始化基础字段
      category.id = generateId();
      category.categoryName = categoryName || '';
      category.description = description || '';
      category.sortOrder = sortOrder || 0;
      category.enabled = enabled || GlobalStatusEnum.YES;
      category.categoryCode = categoryCode || null;

      // 2、默认状态
      category.deleted = GlobalStatusEnum.NO;
      category.creatorId = user.userId;
      category.creatorName = user.nickName;
      category.createdTime = dayjs().toDate();
      category.reviserId = user.userId;
      category.reviserName = user.nickName;
      category.revisedTime = dayjs().toDate();

      // 3、新创建的分类默认是【非】叶子节点
      category.isLeaf = parentId ? GlobalStatusEnum.YES : GlobalStatusEnum.NO;

      // 4、检查分类编码是否唯一（全局唯一）
      await this.checkCategoryCodeUnique(categoryCode);

      // 5、检查同级分类下分类名称是否重复（当前层级唯一）
      await this.checkCategoryNameUnique(parentId, categoryName);

      // 6、设置父子关系
      await this.setCategoryParentRelation(category, parentId);

      // 7、重新保存更新后的分类信息
      const finalCategory = await this.categoryRepository.save(category);

      // 8、如果有父级分类，需要更新父级分类为非叶子节点
      await this.updateParentAsNonLeaf(parentId);

      return finalCategory;
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 修改商品分类
   */
  async updateCategory(
    categoryId: string,
    categoryData: CategoryRequestDto,
    user: JwtUserPayload,
  ): Promise<CommodityCategoryEntity> {
    const {
      parentId,
      categoryName,
      description,
      sortOrder,
      enabled,
      categoryCode,
    } = categoryData;
    try {
      // 1、获取现有分类
      const category = await this.getCategoryById(categoryId);
      if (!category) {
        throw new BusinessException('分类不存在');
      }

      // 2、检查不可将自己设置为自己的父级
      if (parentId === categoryId) {
        throw new BusinessException('不能将分类设置为自身的子分类');
      }

      // 3、如果禁用，需判断是否存在子分类且子分类是否都禁用，且该分类是否被商品列表使用
      const hasDisabledChildren = await this.hasDisabledChildren(categoryId);
      const isHasChildren = await this.hasChildren(categoryId);
      if (
        enabled === GlobalStatusEnum.NO &&
        isHasChildren &&
        !hasDisabledChildren
      ) {
        throw new BusinessException('请先禁用所有子分类');
      }

      // 4、禁用时，判断该分类是否被商品列表使用
      const isUsed = await this.commodityService.checkCategoryIsUsed(
        categoryId,
      );
      if (enabled === GlobalStatusEnum.NO && isUsed) {
        throw new BusinessException('该分类被商品列表使用，请先解除关联');
      }

      // 5、保存原始值用于后续比较
      const originalParentId = category.parentId;
      const originalCategoryCode = category.categoryCode;
      const originalCategoryName = category.categoryName;

      // 6、更新基础字段--只有在提供了新值的情况下才更新字段
      const fieldMap = {
        categoryName,
        description,
        sortOrder,
        enabled,
        categoryCode,
      };
      Object.entries(fieldMap).forEach(([key, value]) => {
        if (value !== undefined) {
          category[key] = value;
        }
      });

      // 7、更新修订信息
      category.reviserId = user.userId;
      category.reviserName = user.nickName;
      category.revisedTime = dayjs().toDate();

      // 8、只有分类编码有变更时才检查【编码唯一性】
      if (categoryCode !== undefined && categoryCode !== originalCategoryCode) {
        await this.checkCategoryCodeUnique(categoryCode, categoryId);
      }

      // 9、只有分类名称或父级有变更时才检查【名称唯一性】
      if (
        (categoryName !== undefined && categoryName !== originalCategoryName) ||
        (parentId !== undefined && parentId !== originalParentId)
      ) {
        // 使用新的parentId或者保持原来的parentId
        const parentIdToCheck =
          parentId !== undefined ? parentId : originalParentId;
        await this.checkCategoryNameUnique(
          parentIdToCheck,
          categoryName || originalCategoryName,
          categoryId,
        );
      }

      // 10、如果父级发生了变化，需要更新树结构关系
      // 判断是否需要处理父级变更逻辑:
      // 1. 明确传入parentId且与原parentId不同
      // 2. 未传入parentId但原本不是一级分类(需要转为一级分类)
      const shouldHandleParentChange =
        (parentId !== undefined && parentId !== originalParentId) ||
        (parentId === undefined && originalParentId !== '1');

      if (shouldHandleParentChange) {
        // 检查当前分类是否存在未删除的子分类
        if (isHasChildren) {
          throw new BusinessException('当前分类存子分类，无法更换父级');
        }

        // 先更新新父级为非叶子节点（如果有了新父级且不是一级分类）
        if (parentId && parentId !== '1') {
          await this.updateParentAsNonLeaf(parentId);
        }

        // 检查【旧父级】是否应变为叶子节点
        // 注意：一级分类永远不应该成为叶子节点
        if (originalParentId && originalParentId !== '1') {
          await this.updateParentAsLeaf(originalParentId, categoryId);
        }

        // 设置分类的父子关系
        if (parentId === undefined) {
          // 转为一级分类
          category.parentId = '1';
          category.categoryLevel = 1;
          category.idRoute = `1_${category.id}`;
        } else {
          // 更换到指定父级
          await this.setCategoryParentRelation(category, parentId);
        }

        // 更新isLeaf状态
        if (category.parentId === '1') {
          // 一级分类始终为非叶子节点
          category.isLeaf = GlobalStatusEnum.NO;
        } else {
          // 非一级分类默认为叶子节点（除非有子节点）
          category.isLeaf = GlobalStatusEnum.YES;
        }
      } else if (originalParentId === '1') {
        // 特殊处理：确保一级分类始终为非叶子节点
        category.isLeaf = GlobalStatusEnum.NO;
      }

      // 11、保存更新后的分类
      const savedCategory = await this.categoryRepository.save(category);

      return savedCategory;
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 删除商品分类
   */
  async deleteCategory(categoryId: string) {
    try {
      // 1、判断分类是否存在
      const category = await this.getCategoryById(categoryId);
      if (!category) {
        throw new BusinessException(`分类不存在`);
      }

      // 2、检查分类下是否有子集
      const isHasChildren = await this.hasChildren(categoryId);

      if (isHasChildren) {
        throw new BusinessException(`存在子分类，请先删除子分类`);
      }

      // 3、判断该分类是否被商品列表使用
      const isUsed = await this.commodityService.checkCategoryIsUsed(
        categoryId,
      );
      if (isUsed) {
        throw new BusinessException('该分类被商品列表使用，请先解除关联');
      }

      // 4、判断更换上级isLeaf字段,不更改一级分类
      const parentCategory = await this.getCategoryById(category.parentId);
      if (parentCategory?.parentId !== '1') {
        await this.updateParentAsLeaf(category.parentId, categoryId);
      }

      // 5、执行删除操作（标记为已删除）
      await this.categoryRepository.update(categoryId, {
        deleted: GlobalStatusEnum.YES,
      });
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  // ----------------------辅助方法------------------

  /**
   * 构建树状结构（支持任意层级）
   */
  async buildCategoryTree(
    categoryList: CommodityCategoryEntity[],
  ): Promise<CommodityCategoryEntity[]> {
    const categoryMap = new Map<string, any>();
    const rootCategory: any[] = [];

    // 1、创建资源映射
    categoryList.forEach((category) => {
      const categoryItem = {
        ...category,
        children: [],
      };

      categoryMap.set(category.id, categoryItem);
    });

    // 2、构建树结构
    categoryList.forEach((category) => {
      const categoryItem = categoryMap.get(category.id);

      if (category.parentId && categoryMap.has(category.parentId)) {
        // 2-1、有父级，添加到父级的children中
        const parent = categoryMap.get(category.parentId);
        parent.children.push(categoryItem);
      } else {
        // 2-2、没有父级或父级不存在，作为根菜单
        rootCategory.push(categoryItem);
      }
    });

    return rootCategory;
  }

  /**
   * 设置分类的父子关系
   */
  private async setCategoryParentRelation(
    category: CommodityCategoryEntity,
    parentId: string | undefined,
  ): Promise<void> {
    if (parentId) {
      // 1、查询父级数据
      const parentCategory = await this.getCategoryById(parentId);
      if (!parentCategory) {
        throw new BusinessException('父级分类不存在');
      }

      // 2、设置父子关系

      category.parentId = parentId;
      category.categoryLevel = parentCategory.categoryLevel + 1;
      category.idRoute = `${parentCategory.idRoute}_${category.id}`;
    } else {
      // 3、创建一级分类
      category.parentId = '1';
      category.categoryLevel = 1;
      category.idRoute = `1_${category.id}`;
    }
  }

  /**
   * 检查分类编码唯一性
   */
  private async checkCategoryCodeUnique(
    categoryCode: string | null,
    excludeId?: string,
  ): Promise<void> {
    if (!categoryCode) return;

    const existingCategory = await this.categoryRepository.findOne({
      where: {
        categoryCode,
        deleted: GlobalStatusEnum.NO,
        ...(excludeId && { id: Not(excludeId) }),
      },
    });

    if (existingCategory) {
      throw new BusinessException('分类编码已存在');
    }
  }

  /**
   * 检查同级分类名称唯一性
   */
  private async checkCategoryNameUnique(
    parentId: string | undefined,
    categoryName: string,
    excludeId?: string,
  ): Promise<void> {
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        parentId: parentId || '1',
        categoryName,
        deleted: GlobalStatusEnum.NO,
        ...(excludeId && { id: Not(excludeId) }),
      },
    });

    if (existingCategory) {
      throw new BusinessException('当前层级下已存在相同的分类名称');
    }
  }

  /**
   * 更新父级分类为非叶子节点
   */
  private async updateParentAsNonLeaf(parentId: string): Promise<void> {
    if (parentId) {
      await this.categoryRepository.update(parentId, {
        isLeaf: GlobalStatusEnum.NO,
      });
    }
  }

  /**
   * 更新父级分类为叶子节点
   */
  private async updateParentAsLeaf(
    originalParentId: string,
    categoryId: string,
  ): Promise<void> {
    if (originalParentId && originalParentId !== '1') {
      const childCount = await this.categoryRepository.count({
        where: {
          parentId: originalParentId,
          deleted: GlobalStatusEnum.NO,
          id: Not(categoryId), // 排除当前正在移动的分类
        },
      });

      // 该节点下无子集，则更新为叶子节点
      if (childCount === 0) {
        // 再次确认该分类不是一级分类
        const parentCategory = await this.getCategoryById(originalParentId);
        // 只有非一级分类且无子节点时才设为叶子节点
        if (parentCategory && parentCategory.parentId !== '1') {
          await this.categoryRepository.update(originalParentId, {
            isLeaf: GlobalStatusEnum.YES,
          });
        }
      }
    }
  }

  /**
   * 判断分类下是否存在被禁用的子分类
   */
  private async hasDisabledChildren(categoryId: string): Promise<boolean> {
    const count = await this.categoryRepository.count({
      where: {
        parentId: categoryId,
        enabled: GlobalStatusEnum.NO,
        deleted: GlobalStatusEnum.NO,
      },
    });

    return count > 0;
  }

  /**
   * 判断分类下是否存在未删除子分类
   */
  private async hasChildren(categoryId: string): Promise<boolean> {
    const count = await this.categoryRepository.count({
      where: {
        parentId: categoryId,
        deleted: GlobalStatusEnum.NO,
      },
    });

    return count > 0;
  }
}
