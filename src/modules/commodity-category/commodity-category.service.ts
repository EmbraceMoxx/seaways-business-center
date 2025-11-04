import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CommodityCategoryEntity } from './commodity-category.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { BusinessException } from '@src/dto/common/common.dto';
import { CategoryRequestDto } from '@src/dto';
import { generateId } from '@src/utils';
import { Not } from 'typeorm';

@Injectable()
export class CommodityCategoryService {
  constructor(
    @InjectRepository(CommodityCategoryEntity)
    private categoryRepositor: Repository<CommodityCategoryEntity>,
  ) {}

  /**
   * 获取商品分类列表-树状（未删除）
   */
  async getCategoryListTree(): Promise<CommodityCategoryEntity[]> {
    const queryBuilder = this.categoryRepositor
      .createQueryBuilder('category')
      .where('category.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      })
      .orderBy('category.created_time', 'DESC');

    const categoryList = await queryBuilder.getMany();

    return await this.buildCategoryTree(categoryList);
  }

  /**
   * 根据id查询商品分类
   */
  async getCategoryById(id: string): Promise<CommodityCategoryEntity> {
    return await this.categoryRepositor.findOne({
      where: {
        id,
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
      category.categoryName = categoryName || '';
      category.description = description || '';
      category.sortOrder = sortOrder || 0;
      category.enabled = enabled || GlobalStatusEnum.YES;
      category.categoryCode = categoryCode || null;

      // 2、默认状态
      category.deleted = GlobalStatusEnum.NO;
      category.creatorId = user.userId;
      category.creatorName = user.username;
      category.createdTime = dayjs().toDate();
      category.reviserId = user.userId;
      category.reviserName = user.username;
      category.revisedTime = dayjs().toDate();

      // 3、新创建的分类默认是叶子节点
      category.isLeaf = GlobalStatusEnum.YES;

      // 4、检查分类编码是否唯一（全局唯一）
      await this.checkCategoryCodeUnique(categoryCode);

      // 5、检查同级分类下分类名称是否重复（当前层级唯一）
      await this.checkCategoryNameUnique(parentId, categoryName);

      // 6、保存新分类（此时会生成真实的ID）
      const savedCategory = await this.categoryRepositor.save(category);

      // 7、设置父子关系
      await this.setCategoryParentRelation(category, parentId);

      // 8、重新保存更新后的分类信息
      const finalCategory = await this.categoryRepositor.save(savedCategory);

      // 9、如果有父级分类，需要更新父级分类为非叶子节点
      await this.updateParentAsNonLeaf(parentId);

      return finalCategory;
    } catch (error) {
      throw new BusinessException('新增失败: ' + error.message);
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

      // 2、保存原始值用于后续比较
      const originalParentId = category.parentId;
      const originalCategoryCode = category.categoryCode;
      const originalCategoryName = category.categoryName;

      // 3、更新基础字段--只有在提供了新值的情况下才更新字段
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

      // 4、更新修订信息
      category.reviserId = user.userId;
      category.reviserName = user.username;
      category.revisedTime = dayjs().toDate();

      // 5、只有分类编码有变更时才检查唯一性
      if (categoryCode !== undefined && categoryCode !== originalCategoryCode) {
        await this.checkCategoryCodeUnique(categoryCode, categoryId);
      }

      // 6、只有分类名称或父级有变更时才检查名称唯一性
      if (
        (categoryName !== undefined && categoryName !== originalCategoryName) ||
        (parentId !== undefined && parentId !== originalParentId)
      ) {
        // 7、使用新的parentId或者保持原来的parentId
        const parentIdToCheck =
          parentId !== undefined ? parentId : originalParentId;
        await this.checkCategoryNameUnique(
          parentIdToCheck,
          categoryName || originalCategoryName,
          categoryId,
        );
      }

      // 8、如果父级发生了变化，需要更新树结构关系
      if (parentId !== originalParentId) {
        // 检查【旧父级】是否应变为叶子节点
        if (originalParentId && originalParentId !== '1') {
          const childCount = await this.categoryRepositor.count({
            where: {
              parentId: originalParentId,
              deleted: GlobalStatusEnum.NO,
              id: Not(categoryId), // 排除当前正在移动的分类
            },
          });

          // 如果【旧父级】分类没有子分类了，则更新为叶子节点
          if (childCount === 0) {
            await this.categoryRepositor.update(originalParentId, {
              isLeaf: GlobalStatusEnum.YES,
            });
          }
        }

        // 先更新分类的父子关系
        await this.setCategoryParentRelation(category, parentId);

        // 更新【新父级】为非叶子节点（如果有新父级）
        if (parentId) {
          await this.updateParentAsNonLeaf(parentId);
        }
      }

      // 9、保存更新后的分类
      const savedCategory = await this.categoryRepositor.save(category);

      return savedCategory;
    } catch (error) {
      throw new BusinessException('修改失败: ' + error.message);
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

    const existingCategory = await this.categoryRepositor.findOne({
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
    const existingCategory = await this.categoryRepositor.findOne({
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
      await this.categoryRepositor.update(parentId, {
        isLeaf: GlobalStatusEnum.NO,
      });
    }
  }
}
