import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BooleanStatusEnum,
  GlobalStatusEnum,
} from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  CommodityBundledSkuResponseDto,
  CommodityResponseDto,
  QueryCommodityDto,
  CommodityRequestDto,
} from '@src/dto';
import * as dayjs from 'dayjs';
import { generateId } from '@src/utils';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { CommodityInfoEntity } from '../entities/commodity-info.entity';
import { CommodityBundledSkuInfoEntity } from '../entities/commodity-bundled-sku-info.entity';
import { CommodityCategoryEntity } from '../entities/commodity-category.entity';
import { CommodityCategoryService } from './commodity-category.service';

@Injectable()
export class CommodityService {
  constructor(
    @InjectRepository(CommodityInfoEntity)
    private commodityRepository: Repository<CommodityInfoEntity>,

    @InjectRepository(CommodityBundledSkuInfoEntity)
    private commodityBundledSkuInfoEntityRepository: Repository<CommodityBundledSkuInfoEntity>,

    @Inject(forwardRef(() => CommodityCategoryService))
    private commodityCategoryService: CommodityCategoryService,
  ) {}

  /**
   * 获取商品列表
   */
  async getcommodityPageList(
    params: QueryCommodityDto,
  ): Promise<{ items: CommodityResponseDto[]; total: number }> {
    try {
      const {
        commodityBarcode,
        commodityInternalCode,
        commodityName,
        categoryId,
        status,
        isQuotaInvolved,
        isSupplySubsidyInvolved,
        isGiftEligible,
        enabled,
        page,
        pageSize,
        commodityAliaName,
        commodityClassify,
      } = params;

      let queryBuilder = this.commodityRepository
        .createQueryBuilder('commodity')
        .select([
          'commodity.id AS id',
          'commodity.commodity_code AS commodityCode',
          'commodity.commodity_name AS commodityName',
          'commodity.commodity_alia_name AS commodityAliaName',
          'commodity.item_spec_piece AS itemSpecPiece',
          'commodity.item_spec_info AS itemSpecInfo',
          'commodity.commodity_internal_code AS commodityInternalCode',
          'commodity.commodity_barcode AS commodityBarcode',
          'commodity.commodity_first_category AS commodityFirstCategory',
          'commodity.box_spec_info AS boxSpecInfo',
          'commodity.box_spec_piece AS boxSpecPiece',
          'commodity.item_ex_factory_price AS itemExFactoryPrice',
          'firstCategory.category_name AS commodityFirstCategoryName',
          'commodity.commodity_second_category AS commoditySecondCategory',
          'secondCategory.category_name AS commoditySecondCategoryName',
          'commodity.is_quota_involved AS isQuotaInvolved',
          'commodity.is_supply_subsidy_involved AS isSupplySubsidyInvolved',
          'commodity.is_gift_eligible AS isGiftEligible',
          'commodity.status AS status',
          'commodity.enabled AS enabled',
          'commodity.creator_id AS creatorId',
          'commodity.creator_name AS creatorName',
          'commodity.created_time AS createdTime',
        ])
        .leftJoin(
          CommodityCategoryEntity,
          'firstCategory',
          'firstCategory.id=commodity.commodity_first_category',
        )
        .leftJoin(
          CommodityCategoryEntity,
          'secondCategory',
          'secondCategory.id = commodity.commodity_second_category',
        )
        .where('commodity.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        });

      // 商品类型,1-成品、2-辅销、3-货补
      if (commodityClassify) {
        if (commodityClassify === '1') {
          const { id: fistCategoryId } =
            await this.commodityCategoryService.getCategoryByName('成品商品');
          queryBuilder = queryBuilder.andWhere(
            'commodity.commodity_first_category = :fistCategoryId',
            {
              fistCategoryId,
            },
          );
        } else if (commodityClassify === '2') {
          queryBuilder = queryBuilder.andWhere(
            'commodity.is_gift_eligible = :isGiftEligible',
            {
              isGiftEligible: BooleanStatusEnum.TRUE,
            },
          );
        } else if (commodityClassify === '3') {
          queryBuilder = queryBuilder.andWhere(
            'commodity.is_supply_subsidy_involved = :isSupplySubsidyInvolved',
            {
              isSupplySubsidyInvolved: BooleanStatusEnum.TRUE,
            },
          );
        }
      }

      // 商品条码
      if (commodityBarcode) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.commodity_barcode LIKE :commodityBarcode',
          {
            commodityBarcode: `%${commodityBarcode}%`,
          },
        );
      }

      // 商品内部编码
      if (commodityInternalCode) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.commodity_internal_code LIKE :commodityInternalCode',
          {
            commodityInternalCode: `%${commodityInternalCode}%`,
          },
        );
      }

      // 商品名称
      if (commodityName) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.commodity_name LIKE :commodityName',
          {
            commodityName: `%${commodityName}%`,
          },
        );
      }

      // 商品简称
      if (commodityAliaName) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.commodity_alia_name LIKE :commodityAliaName',
          {
            commodityAliaName: `%${commodityAliaName}%`,
          },
        );
      }

      // 分类
      if (categoryId) {
        queryBuilder = queryBuilder.andWhere(
          '(commodity.commodity_first_category = :categoryId OR commodity.commodity_second_category = :categoryId)',
          {
            categoryId,
          },
        );
      }

      // 是否启用
      if (enabled) {
        queryBuilder = queryBuilder.andWhere('commodity.enabled = :enabled', {
          enabled,
        });
      }

      // 商品状态
      if (status) {
        queryBuilder = queryBuilder.andWhere('commodity.status = :status', {
          status,
        });
      }

      // 是否参与额度计算
      if (isQuotaInvolved) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.is_quota_involved = :isQuotaInvolved',
          {
            isQuotaInvolved,
          },
        );
      }

      // 是否参与货补
      if (isSupplySubsidyInvolved) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.is_supply_subsidy_involved = :isSupplySubsidyInvolved',
          {
            isSupplySubsidyInvolved,
          },
        );
      }

      // 是否可做赠品
      if (isGiftEligible) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.is_gift_eligible = :isGiftEligible',
          {
            isGiftEligible,
          },
        );
      }

      // 先执行计数查询（在添加分页条件之前）
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('commodity.created_time', 'DESC')
        .orderBy('commodity.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const commodity = await queryBuilder.getRawMany();
      return { items: commodity, total };
    } catch (error) {
      throw new BusinessException('获取商品列表失败');
    }
  }

  /**
   * 获取商品详情
   */
  async getCommodityById(id: string): Promise<any> {
    try {
      // 使用 QueryBuilder 获取实体对象（不指定字段）
      const commodity = await this.commodityRepository
        .createQueryBuilder('commodity')
        .where('commodity.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .andWhere('commodity.id = :id', { id })
        .getOne();

      if (!commodity) {
        throw new BusinessException('商品不存在');
      }

      // 单独获取分类信息
      let firstCategoryName = null;
      let secondCategoryName = null;

      if (commodity.commodityFirstCategory) {
        const firstCategory = await this.commodityRepository.manager
          .getRepository(CommodityCategoryEntity)
          .findOne({
            where: { id: commodity.commodityFirstCategory },
          });
        firstCategoryName = firstCategory ? firstCategory.categoryName : null;
      }

      if (commodity.commoditySecondCategory) {
        const secondCategory = await this.commodityRepository.manager
          .getRepository(CommodityCategoryEntity)
          .findOne({
            where: { id: commodity.commoditySecondCategory },
          });
        secondCategoryName = secondCategory
          ? secondCategory.categoryName
          : null;
      }

      // 构建返回对象
      const response = {
        ...commodity,
        itemExFactoryPrice: Number(commodity.itemExFactoryPrice),
        itemSuggestedPrice: Number(commodity.itemSuggestedPrice),
        itemMinRetailPrice: Number(commodity.itemMinRetailPrice),
        itemMinRetailDiscount: Number(commodity.itemMinRetailDiscount),
        itemMinControlledDiscount: Number(commodity.itemMinControlledDiscount),
        commodityFirstCategoryName: firstCategoryName,
        commoditySecondCategoryName: secondCategoryName,
        compositeCommodity: [],
      };

      if (commodity.isBundledProducts === 1) {
        // 获取组合商品信息
        const compositeCommodity =
          await this.getBundledSkusWithCommodityInfoByCommodityId(id);
        response.compositeCommodity = compositeCommodity;
      } else {
        response.compositeCommodity = [];
      }

      return response;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException('获取商品详情失败');
    }
  }

  /**
   * 获取商品基本信息
   */
  async getCommodityInfoById(id: string): Promise<CommodityInfoEntity> {
    try {
      // 根据id获取启用未删除的商品
      const commodity = await this.commodityRepository
        .createQueryBuilder('commodity')
        .where('commodity.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .andWhere('commodity.enabled = :enabled', {
          enabled: GlobalStatusEnum.YES,
        })
        .andWhere('commodity.id = :id', { id })
        .getOne();
      return commodity;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException('获取商品详情失败');
    }
  }

  /**
   * 根据商品ID获取绑定的组合商品信息
   */
  async getBundledSkusWithCommodityInfoByCommodityId(
    commodityId: string,
  ): Promise<CommodityBundledSkuResponseDto[]> {
    try {
      // 查询绑定的组合商品信息
      const bundledSkus = await this.commodityRepository.manager
        .getRepository(CommodityBundledSkuInfoEntity)
        .createQueryBuilder('bundledSku')
        .where('bundledSku.commodityId = :commodityId', { commodityId })
        .andWhere('bundledSku.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .getMany();

      // 获取所有组合商品ID
      const bundledCommodityIds = bundledSkus
        .map((sku) => sku.bundledCommodityId)
        .filter((id) => id !== null && id !== undefined);

      // 批量查询组合商品详细信息
      let bundledCommodityInfoMap: Record<
        string,
        {
          commodityName: string;
          commodityInternalCode: string;
          commodityBarcode: string;
          itemSpecInfo: string;
        }
      > = {};

      if (bundledCommodityIds.length > 0) {
        const bundledCommodities = await this.commodityRepository
          .createQueryBuilder('commodity')
          .select([
            'commodity.id',
            'commodity.commodityName',
            'commodity.commodityInternalCode',
            'commodity.commodityBarcode',
            'commodity.itemSpecInfo',
          ])
          .where('commodity.id IN (:...ids)', { ids: bundledCommodityIds })
          .andWhere('commodity.deleted = :deleted', {
            deleted: GlobalStatusEnum.NO,
          })
          .andWhere('commodity.enabled = :enabled', {
            enabled: GlobalStatusEnum.YES,
          })
          .getMany();

        // 构建ID到商品信息的映射
        bundledCommodityInfoMap = bundledCommodities.reduce(
          (map, commodity) => {
            map[commodity.id] = {
              commodityName: commodity.commodityName,
              commodityInternalCode: commodity.commodityInternalCode || '',
              commodityBarcode: commodity.commodityBarcode || '',
              itemSpecInfo: commodity.itemSpecInfo || '',
            };
            return map;
          },
          {} as Record<
            string,
            {
              commodityName: string;
              commodityInternalCode: string;
              commodityBarcode: string;
              itemSpecInfo: string;
            }
          >,
        );
      }

      // 构造返回结果
      return bundledSkus.map((sku) => {
        const commodityInfo = bundledCommodityInfoMap[
          sku.bundledCommodityId
        ] || {
          commodityName: '',
          commodityInternalCode: '',
          commodityBarcode: '',
          itemSpecInfo: '',
        };

        return {
          id: String(sku.id),
          commodityName: commodityInfo.commodityName,
          commodityInternalCode: commodityInfo.commodityInternalCode,
          commodityBarcode: commodityInfo.commodityBarcode,
          itemSpecInfo: commodityInfo.itemSpecInfo,
          bundledCommodityId: sku.bundledCommodityId,
        };
      });
    } catch (error) {
      throw new BusinessException('获取组合商品信息失败');
    }
  }

  /**
   * 根据分类id查询商品，判断当前分类是否被使用
   */
  async checkCategoryIsUsed(categoryId: string): Promise<boolean> {
    try {
      const isUsed = await this.commodityRepository.manager
        .getRepository(CommodityInfoEntity)
        .createQueryBuilder('commodity')
        .where('commodity.commodityFirstCategory = :categoryId', {
          categoryId,
        })
        .orWhere('commodity.commoditySecondCategory = :categoryId', {
          categoryId,
        })
        .andWhere('commodity.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        });

      return (await isUsed.getCount()) > 0;
    } catch (error) {
      throw new BusinessException('查询商品失败');
    }
  }

  async getCommodityListByCommodityIds(
    commodityIds: string[],
  ): Promise<CommodityInfoEntity[]> {
    return await this.commodityRepository
      .createQueryBuilder('commodity')
      .where('commodity.id IN (:...commodityIds)', { commodityIds })
      .andWhere('commodity.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      })
      .andWhere('commodity.enabled = :enabled', {
        enabled: GlobalStatusEnum.YES,
      })
      .andWhere('commodity.status = :status', {
        status: BooleanStatusEnum.TRUE,
      })
      .getMany();
  }
  async getCommodityBundleIdListByCommodityId(
    commodityId: string,
  ): Promise<CommodityBundledSkuInfoEntity[]> {
    return await this.commodityBundledSkuInfoEntityRepository
      .createQueryBuilder('bundle')
      .where('bundle.commodity_id = :commodityId', { commodityId: commodityId })
      .andWhere('bundle.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      })
      .andWhere('bundle.enabled = :enabled', {
        enabled: GlobalStatusEnum.YES,
      })
      .getMany();
  }

  /**
   * 新增商品组合信息（覆盖式）
   */
  async addCommodityBundleInfo(
    commodityId: string,
    bundleCommodity: any,
    userPayload: JwtUserPayload,
  ): Promise<void> {
    // 1、查询是否给该商品commodityId绑过组合商品
    const existingBundles = await this.getCommodityBundleIdListByCommodityId(
      commodityId,
    );

    if (existingBundles && existingBundles.length > 0) {
      // 1.1 存在则清空
      for (const bundle of existingBundles) {
        await this.deleteCommodityBundleInfo(bundle.id);
      }
    }

    // 2、构建组合信息
    const bundleInfo = new CommodityBundledSkuInfoEntity();

    // 3、设置组合信息、
    bundleInfo.id = generateId();
    bundleInfo.commodityId = commodityId;
    bundleInfo.bundledCommodityId = bundleCommodity.bundledCommodityId;
    bundleInfo.bundleCommodityInternalCode =
      bundleCommodity.commodityInternalCode;
    bundleInfo.bundleCommodityBarcode = bundleCommodity.commodityBarcode;

    // 4、默认
    bundleInfo.enabled = GlobalStatusEnum.YES;
    bundleInfo.deleted = GlobalStatusEnum.NO;

    // 5、设置创建时间
    bundleInfo.creatorId = userPayload.userId;
    bundleInfo.creatorName = userPayload.nickName;
    bundleInfo.createdTime = dayjs().toDate();

    // 6、设置更新时间
    bundleInfo.reviserId = userPayload.userId;
    bundleInfo.reviserName = userPayload.nickName;
    bundleInfo.revisedTime = dayjs().toDate();

    await this.commodityBundledSkuInfoEntityRepository.save(bundleInfo);
  }

  /**
   * 删除组合信息
   */
  async deleteCommodityBundleInfo(id: string): Promise<void> {
    // 软删除
    await this.commodityBundledSkuInfoEntityRepository.update(
      { id },
      {
        deleted: GlobalStatusEnum.YES,
      },
    );
  }

  /**
   * 根据一级分类自动生成商品编码
   * @param firstCategoryId 一级分类ID
   * @returns 自动生成的商品编码
   */
  private async generateCommodityCode(
    firstCategoryId: string,
  ): Promise<string> {
    try {
      // 查询该一级分类下最大的商品编码
      const result = await this.commodityRepository
        .createQueryBuilder('commodity')
        .select('MAX(commodity.commodityCode)', 'maxCode')
        .where('commodity.commodity_first_category = :firstCategoryId', {
          firstCategoryId,
        })
        .andWhere("commodity.commodityCode LIKE 'CP_%'") // 筛选符合 CP_ 开头格式的编码
        .getRawOne();

      if (result && result.maxCode) {
        // 提取下划线后的数字部分
        const parts = result.maxCode.split('_');
        if (parts.length >= 2) {
          const numberPart = parts[1];
          // 将字符串转换为数字并加1
          const nextNumber = parseInt(numberPart, 10) + 1;
          // 保持6位数字格式，不足的前面补0
          return `CP_${nextNumber.toString().padStart(6, '0')}`;
        }
      }

      // 如果没有找到现有编码或解析失败，默认从000001开始
      return 'CP_000001';
    } catch (error) {
      throw new BusinessException('生成商品编码失败');
    }
  }

  /**
   * 新增商品
   */
  async addCommodity(
    commodityData: CommodityRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、构建商品信息
      const commodity = new CommodityInfoEntity();

      // 2、出厂价不能大于建议零售价
      if (commodityData.itemExFactoryPrice > commodityData.itemSuggestedPrice) {
        throw new BusinessException('零售价要大于等于出厂价');
      }

      // 3、设置商品信息
      commodity.id = generateId();
      commodity.commodityCode = await this.generateCommodityCode(
        commodityData.commodityFirstCategory,
      );
      commodity.commodityFirstCategory = commodityData.commodityFirstCategory;
      commodity.commoditySecondCategory = commodityData.commoditySecondCategory;
      commodity.commodityName = commodityData.commodityName;
      commodity.commodityAliaName = commodityData.commodityAliaName;
      commodity.commodityInternalCode = commodityData.commodityInternalCode;
      commodity.commodityBarcode = commodityData.commodityBarcode;
      commodity.status = commodityData.status;
      commodity.isBundledProducts = commodityData.isBundledProducts;
      commodity.isQuotaInvolved = commodityData.isQuotaInvolved;
      commodity.isGiftEligible = commodityData.isGiftEligible;
      commodity.isSupplySubsidyInvolved = commodityData.isSupplySubsidyInvolved;
      commodity.itemSpecPiece = commodityData.itemSpecPiece;
      commodity.itemSpecUnit = commodityData.itemSpecUnit;
      commodity.itemSpecInfo = commodityData.itemSpecInfo;
      commodity.itemMinSpecUnit = commodityData.itemMinSpecUnit;
      commodity.boxSpecPiece = commodityData.boxSpecPiece;
      commodity.boxSpecInfo = commodityData.boxSpecInfo;
      commodity.material = commodityData.material;
      commodity.itemExFactoryPrice = commodityData?.itemExFactoryPrice
        ? String(commodityData?.itemExFactoryPrice)
        : null;
      commodity.itemSuggestedPrice = commodityData?.itemSuggestedPrice
        ? String(commodityData?.itemSuggestedPrice)
        : null;
      commodity.itemMinRetailPrice = commodityData?.itemMinRetailPrice
        ? String(commodityData?.itemMinRetailPrice)
        : null;
      commodity.itemMinRetailDiscount = commodityData?.itemMinRetailDiscount
        ? String(commodityData?.itemMinRetailDiscount)
        : null;
      commodity.itemMinControlledDiscount =
        commodityData?.itemMinControlledDiscount
          ? String(commodityData?.itemMinControlledDiscount)
          : null;

      // 4、默认
      commodity.enabled = GlobalStatusEnum.YES;
      commodity.deleted = GlobalStatusEnum.NO;

      // 5、设置创建时间
      commodity.creatorId = userPayload.userId;
      commodity.creatorName = userPayload.nickName;
      commodity.createdTime = dayjs().toDate();

      // 6、设置更新时间
      commodity.reviserId = userPayload.userId;
      commodity.reviserName = userPayload.nickName;
      commodity.revisedTime = dayjs().toDate();

      // 7、保存商品
      const savedCommodity = await this.commodityRepository.save(commodity);

      // 7、 组合商品
      // if (
      //   commodityData.compositeCommodity &&
      //   commodityData.compositeCommodity.length > 0
      // ) {
      //   await Promise.all(
      //     commodityData.compositeCommodity.map((item) =>
      //       this.addCommodityBundleInfo(commodity.id, item, userPayload),
      //     ),
      //   );
      // } else {
      //   await this.deleteCommodityBundleInfo(commodity.id);
      // }
      return savedCommodity;
    } catch (error) {
      throw new BusinessException('新增商品失败');
    }
  }

  /**
   * 更新商品
   */
  async updateCommodity(
    id: string,
    commodityData: CommodityRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、判断商品是否存在
      const commodityInfo = await this.getCommodityInfoById(id);
      if (!commodityInfo) {
        throw new BusinessException('商品不存在');
      }

      // 2、出厂价不能大于建议零售价
      if (commodityData.itemExFactoryPrice > commodityData.itemSuggestedPrice) {
        throw new BusinessException('零售价要大于等于出厂价');
      }

      // 3、构建商品信息
      const commodity = new CommodityInfoEntity();

      // 4、设置商品信息
      commodity.status = commodityData.status;
      commodity.isQuotaInvolved = commodityData.isQuotaInvolved;
      commodity.isGiftEligible = commodityData.isGiftEligible;
      commodity.isSupplySubsidyInvolved = commodityData.isSupplySubsidyInvolved;
      commodity.itemExFactoryPrice = commodityData?.itemExFactoryPrice
        ? String(commodityData?.itemExFactoryPrice)
        : null;
      commodity.itemSuggestedPrice = commodityData?.itemSuggestedPrice
        ? String(commodityData?.itemSuggestedPrice)
        : null;
      commodity.itemMinRetailPrice = commodityData?.itemMinRetailPrice
        ? String(commodityData?.itemMinRetailPrice)
        : null;
      commodity.itemMinRetailDiscount = commodityData?.itemMinRetailDiscount
        ? String(commodityData?.itemMinRetailDiscount)
        : null;
      commodity.itemMinControlledDiscount =
        commodityData?.itemMinControlledDiscount
          ? String(commodityData?.itemMinControlledDiscount)
          : null;

      // 5、设置更新时间
      commodity.reviserId = userPayload.userId;
      commodity.reviserName = userPayload.nickName;
      commodity.revisedTime = dayjs().toDate();

      // 6、更新客商品信息
      await this.commodityRepository.update(id, commodity);

      // 7、 组合商品
      // if (
      //   commodityData.compositeCommodity &&
      //   commodityData.compositeCommodity.length > 0
      // ) {
      //   await Promise.all(
      //     commodityData.compositeCommodity.map((item) =>
      //       this.addCommodityBundleInfo(commodity.id, item, userPayload),
      //     ),
      //   );
      // } else {
      //   // 删除组合商品
      //   await this.deleteCommodityBundleInfo(commodity.id);
      // }
    } catch (error) {
      throw new BusinessException('更新商品失败');
    }
  }
}
