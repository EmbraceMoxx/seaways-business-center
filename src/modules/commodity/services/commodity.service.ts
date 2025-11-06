import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommodityInfoEntity } from '../entities/commodity-info.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { QueryCommodityDto, CommodityResponseDto } from '@src/dto';
import { CommodityCategoryEntity } from '../../commodity-category/commodity-category.entity';

@Injectable()
export class CommodityService {
  constructor(
    @InjectRepository(CommodityInfoEntity)
    private commodityRepositor: Repository<CommodityInfoEntity>,
  ) {}

  /**
   *
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
      } = params;

      // 分页参数--页码、页数
      const page = Math.max(1, Number(params.page) || 1);
      const pageSize = Number(params.pageSize) || 20;

      let queryBuilder = this.commodityRepositor
        .createQueryBuilder('commodity')
        .select([
          'commodity.id AS id',
          'commodity.commodity_code AS commodityCode',
          'commodity.commodity_name AS commodityName',
          'commodity.item_spec_piece AS itemSpecPiece',
          'commodity.commodity_internal_code AS commodityInternalCode',
          'commodity.commodity_barcode AS commodityBarcode',
          'commodity.commodity_first_category AS commodityFirstCategory',
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

      // 分类
      if (categoryId) {
        queryBuilder = queryBuilder.andWhere(
          'commodity.commodity_second_category = :categoryId',
          {
            categoryId,
          },
        );
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
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const commodity = await queryBuilder.getRawMany();
      return { items: commodity, total };
    } catch (error) {
      throw new BusinessException('获取商品列表失败');
    }
  }
}
