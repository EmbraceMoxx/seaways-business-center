import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { generateId } from '@src/utils';
import { CommodityCustomerPriceRequestDto } from '@src/dto';
import { CommodityCustomerPriceEntity } from '../entities/commodity-customer-price.entity';
import { CommodityInfoEntity } from '../entities/commodity-info.entity';

@Injectable()
export class CommodityCustomerPriceService {
  constructor(
    @InjectRepository(CommodityCustomerPriceEntity)
    private CommodityCustomerRepository: Repository<CommodityCustomerPriceEntity>,
  ) {}

  /**
   * 添加商品客户价格（批量）-覆盖式
   * @param commodityPriceList 商品价格列表
   * @param user 用户信息
   * @param manager 事务管理器
   */
  async addCommodityCustomerPrice(
    customerId: string,
    commodityPriceList: CommodityCustomerPriceRequestDto[],
    user: JwtUserPayload,
    manager: EntityManager,
  ) {
    // 先删除该客户的所有商品价格记录（软删除）
    await this.deleteCustomerCommodityPrices(customerId, user, manager);

    // 如果传入为空，则只执行删除操作
    if (!commodityPriceList || commodityPriceList.length === 0) {
      return;
    }

    // 批量插入新的商品价格记录
    const newRecords = commodityPriceList.map((item) => {
      return {
        id: generateId(),
        commodityId: item.commodityId,
        commodityName: item.commodityName,
        commodityInternalCode: item.commodityInternalCode,
        customerId: customerId,
        itemExFactoryPrice: String(item.itemExFactoryPrice),
        isSupplySubsidyInvolved: item.isSupplySubsidyInvolved,
        isQuotaInvolved: item.isQuotaInvolved,
        isGiftEligible: item.isGiftEligible,
        enabled: GlobalStatusEnum.YES,
        deleted: GlobalStatusEnum.NO,
        creatorId: user.userId,
        creatorName: user.nickName,
        createdTime: dayjs().toDate(),
        reviserId: user.userId,
        reviserName: user.nickName,
        revisedTime: dayjs().toDate(),
      };
    });

    // 批量插入新记录
    if (newRecords.length > 0) {
      await manager.insert(CommodityCustomerPriceEntity, newRecords);
    }
  }

  /**
   * 根据客户ID查询商品客户价格列表
   */
  async getCommodityCustomerPriceList(
    customerId: string,
  ): Promise<CommodityCustomerPriceEntity[]> {
    const commodityCustomerPrice =
      await this.CommodityCustomerRepository.createQueryBuilder(
        'commodityCustomer',
      )
        .select([
          'commodityCustomer.id as id',
          'commodityCustomer.commodity_id as commodityId',
          'commodity.commodity_barcode as commodityBarcode',
          'commodityCustomer.commodity_name as commodityName',
          'commodityCustomer.commodity_internal_code as commodityInternalCode',
          'commodityCustomer.customer_id as customerId',
          'commodityCustomer.item_ex_factory_price as itemExFactoryPrice',
          'commodityCustomer.is_supply_subsidy_involved as isSupplySubsidyInvolved',
          'commodityCustomer.is_quota_involved as isQuotaInvolved',
          'commodityCustomer.is_gift_eligible as isGiftEligible',
          'commodityCustomer.enabled as enabled',
          'commodityCustomer.deleted as deleted',
          'commodityCustomer.creator_id as creatorId',
          'commodityCustomer.created_time as createdTime',
          'commodityCustomer.creator_name as creatorName',
        ])
        .leftJoin(
          CommodityInfoEntity,
          'commodity',
          'commodity.id=commodityCustomer.commodity_id',
        )
        .where('commodityCustomer.customer_id = :customerId', {
          customerId,
        })
        .andWhere('commodityCustomer.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .andWhere('commodityCustomer.enabled = :enabled', {
          enabled: GlobalStatusEnum.YES,
        })
        .getRawMany();

    return commodityCustomerPrice;
  }

  private async deleteCustomerCommodityPrices(
    customerId: string,
    user: JwtUserPayload,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(
      CommodityCustomerPriceEntity,
      {
        customerId: customerId,
      },
      {
        deleted: GlobalStatusEnum.YES,
        revisedTime: dayjs().toDate(),
        reviserId: user.userId,
        reviserName: user.nickName,
      },
    );
  }
}
