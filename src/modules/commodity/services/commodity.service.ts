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
  async getCommodityById(id: string): Promise<CommodityResponseDto> {
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
        commodityFirstCategoryName: firstCategoryName,
        commoditySecondCategoryName: secondCategoryName,
        compositeCommodity: [],
      } as CommodityResponseDto;

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
   * 新增商品
   */
  async addCommodity(
    commodityData: CommodityRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、构建商品信息
      const commodity = new CommodityInfoEntity();

      // 2、设置商品信息
      commodity.commodityCode = commodityData.commodityCode;
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
      commodity.itemExFactoryPrice = commodityData.itemExFactoryPrice;
      commodity.itemSuggestedPrice = commodityData.itemSuggestedPrice;
      commodity.itemMinRetailPrice = commodityData.itemMinRetailPrice;
      commodity.itemMinRetailDiscount = commodityData.itemMinRetailDiscount;
      commodity.itemMinControlledDiscount =
        commodityData.itemMinControlledDiscount;

      // 3、 组合商品id(后续要去新增组合商品关系表)
      commodity.compositeCommodity = commodityData.compositeCommodity;

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

      // 7、更新客户地址
      return await this.commodityRepository.save(commodity);
    } catch (error) {
      throw new BusinessException('新增商品分类失败');
    }
  }
}
