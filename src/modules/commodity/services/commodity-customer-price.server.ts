import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { generateId } from '@src/utils';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCommodityCustomerDto,
  CommodityCustomerPriceResponseDto,
  CommodityCustomerPriceRequestDto,
  QueryCommodityCustomerOtherDto,
} from '@src/dto';
import { CommodityCustomerPriceEntity } from '../entities/commodity-customer-price.entity';
import { CommodityInfoEntity } from '../entities/commodity-info.entity';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CustomerService } from '@modules/customer/services/customer.service';
import { UserService } from '@modules/common/user/user.service';

@Injectable()
export class CommodityCustomerPriceService {
  constructor(
    @InjectRepository(CommodityCustomerPriceEntity)
    private CommodityCustomerRepository: Repository<CommodityCustomerPriceEntity>,
    @Inject(forwardRef(() => CommodityService))
    private commodityService: CommodityService,
    @Inject(forwardRef(() => CustomerService))
    private customerService: CustomerService,
    private userService: UserService,
  ) {}

  /**
   * 商品客户价格列表
   */
  async getCommodityCustomerPriceList(
    params: QueryCommodityCustomerDto,
    user: JwtUserPayload,
    token: string,
  ): Promise<{ items: CommodityCustomerPriceResponseDto[]; total: number }> {
    try {
      const {
        commodityName,
        customerName,
        commodityInternalCode,
        page,
        pageSize,
      } = params;

      let queryBuilder =
        await this.CommodityCustomerRepository.createQueryBuilder(
          'commodityCustomer',
        )
          .select([
            'commodityCustomer.id as id',
            'commodityCustomer.commodity_id as commodityId',
            'commodity.commodity_barcode as commodityBarcode',
            `COALESCE(NULLIF(commodityCustomer.commodity_name, ''), commodity.commodity_name) as commodityName`,
            'commodityCustomer.commodity_internal_code as commodityInternalCode',
            'commodityCustomer.customer_id as customerId',
            'customer.customer_name as customerName',
            'commodityCustomer.item_ex_factory_price as itemExFactoryPrice',
            'commodityCustomer.is_supply_subsidy_involved as isSupplySubsidyInvolved',
            'commodityCustomer.is_quota_involved as isQuotaInvolved',
            'commodityCustomer.is_gift_eligible as isGiftEligible',
            'commodityCustomer.enabled as enabled',
            'commodityCustomer.creator_id as creatorId',
            'commodityCustomer.created_time as createdTime',
            'commodityCustomer.creator_name as creatorName',
          ])
          .leftJoin(
            CommodityInfoEntity,
            'commodity',
            'commodity.id=commodityCustomer.commodity_id',
          )
          .leftJoin(
            CustomerInfoEntity,
            'customer',
            'customer.id=commodityCustomer.customer_id',
          )
          .where('commodityCustomer.deleted = :deleted', {
            deleted: GlobalStatusEnum.NO,
          });

      // 商品名称
      if (commodityName) {
        queryBuilder = queryBuilder.andWhere(
          '(commodityCustomer.commodity_name LIKE :commodityName OR commodity.commodity_name LIKE :commodityName)',
          { commodityName: `%${commodityName}%` },
        );
      }

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'customer.customer_name LIKE :customerName',
          { customerName: `%${customerName}%` },
        );
      }

      // 内部编码
      if (commodityInternalCode) {
        queryBuilder = queryBuilder.andWhere(
          'commodityCustomer.commodity_internal_code LIKE :commodityInternalCode',
          {
            commodityInternalCode: `%${commodityInternalCode}%`,
          },
        );
      }

      // 获取权限
      const checkResult = await this.userService.getRangeOfOrderQueryUser(
        token,
        user.userId,
      );
      if (!checkResult || checkResult.isQueryAll) {
        // 不限制客户范围，继续查询
      } else if (!checkResult.principalUserIds?.length) {
        return { items: [], total: 0 };
      } else {
        // 收集所有人负责的客户ID，去查询订单对应的客户ID
        const customerIds = await this.customerService.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return { items: [], total: 0 };
        }

        queryBuilder = queryBuilder.andWhere(
          'commodityCustomer.customer_id IN (:customerIds)',
          { customerIds },
        );
      }
      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('commodityCustomer.created_time', 'DESC')
        .addOrderBy('commodityCustomer.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const items = await queryBuilder.getRawMany();

      // 将价格转换为数字类型
      const formattedItems = items.map((item) => ({
        ...item,
        itemExFactoryPrice: item.itemExFactoryPrice
          ? parseFloat(item.itemExFactoryPrice)
          : 0,
      }));

      return { items: formattedItems, total };
    } catch (error) {
      throw new BusinessException('获取列表失败' + error.message);
    }
  }

  /**
   * 商品客户价格列表-用于客户详情（分页、无权限）
   */
  async getCommodityCustomerPricePageListOther(
    params: QueryCommodityCustomerOtherDto,
  ): Promise<{ items: CommodityCustomerPriceResponseDto[]; total: number }> {
    try {
      const { keyValue, customerId, page, pageSize } = params;

      let queryBuilder =
        await this.CommodityCustomerRepository.createQueryBuilder(
          'commodityCustomer',
        )
          .select([
            'commodityCustomer.id as id',
            'commodityCustomer.commodity_id as commodityId',
            'commodity.commodity_barcode as commodityBarcode',
            `COALESCE(NULLIF(commodityCustomer.commodity_name, ''), commodity.commodity_name) as commodityName`,
            'commodityCustomer.commodity_internal_code as commodityInternalCode',
            'commodityCustomer.customer_id as customerId',
            'customer.customer_name as customerName',
            'commodityCustomer.item_ex_factory_price as itemExFactoryPrice',
            'commodityCustomer.is_supply_subsidy_involved as isSupplySubsidyInvolved',
            'commodityCustomer.is_quota_involved as isQuotaInvolved',
            'commodityCustomer.is_gift_eligible as isGiftEligible',
            'commodityCustomer.enabled as enabled',
            'commodityCustomer.creator_id as creatorId',
            'commodityCustomer.created_time as createdTime',
            'commodityCustomer.creator_name as creatorName',
          ])
          .leftJoin(
            CommodityInfoEntity,
            'commodity',
            'commodity.id=commodityCustomer.commodity_id',
          )
          .leftJoin(
            CustomerInfoEntity,
            'customer',
            'customer.id=commodityCustomer.customer_id',
          )
          .where('commodityCustomer.deleted = :deleted', {
            deleted: GlobalStatusEnum.NO,
          })
          .andWhere('commodityCustomer.customer_id = :customerId', {
            customerId: customerId,
          });

      // 搜索关键字-商品名称（自定义名称或标准名称）、内部编码
      if (keyValue) {
        queryBuilder = queryBuilder.andWhere(
          '(commodityCustomer.commodity_name LIKE :keyValue OR commodity.commodity_name LIKE :keyValue OR commodityCustomer.commodity_internal_code LIKE :keyValue)',
          { keyValue: `%${keyValue}%` },
        );
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('commodityCustomer.created_time', 'DESC')
        .addOrderBy('commodityCustomer.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取列表失败' + error.message);
    }
  }

  /**
   * 商品客户价格列表-用于客户详情（不分页、无权限）
   */
  async getCommodityCustomerPriceListOther(
    customerId: string,
  ): Promise<CommodityCustomerPriceResponseDto[]> {
    try {
      let queryBuilder =
        await this.CommodityCustomerRepository.createQueryBuilder(
          'commodityCustomer',
        )
          .select([
            'commodityCustomer.id as id',
            'commodityCustomer.commodity_id as commodityId',
            'commodity.commodity_barcode as commodityBarcode',
            `COALESCE(NULLIF(commodityCustomer.commodity_name, ''), commodity.commodity_name) as commodityName`,
            'commodityCustomer.commodity_internal_code as commodityInternalCode',
            'commodityCustomer.customer_id as customerId',
            'customer.customer_name as customerName',
            'commodityCustomer.item_ex_factory_price as itemExFactoryPrice',
            'commodityCustomer.is_supply_subsidy_involved as isSupplySubsidyInvolved',
            'commodityCustomer.is_quota_involved as isQuotaInvolved',
            'commodityCustomer.is_gift_eligible as isGiftEligible',
            'commodityCustomer.enabled as enabled',
            'commodityCustomer.creator_id as creatorId',
            'commodityCustomer.created_time as createdTime',
            'commodityCustomer.creator_name as creatorName',
          ])
          .leftJoin(
            CommodityInfoEntity,
            'commodity',
            'commodity.id=commodityCustomer.commodity_id',
          )
          .leftJoin(
            CustomerInfoEntity,
            'customer',
            'customer.id=commodityCustomer.customer_id',
          )
          .where('commodityCustomer.deleted = :deleted', {
            deleted: GlobalStatusEnum.NO,
          })
          .andWhere('commodityCustomer.customer_id = :customerId', {
            customerId: customerId,
          });

      queryBuilder = queryBuilder
        .orderBy('commodityCustomer.created_time', 'DESC')
        .addOrderBy('commodityCustomer.id', 'DESC');

      const items = await queryBuilder.getRawMany();

      return items;
    } catch (error) {
      throw new BusinessException('获取列表失败' + error.message);
    }
  }

  /**
   * 根据商品id和客户id查询
   */
  async getDataByCommodityIdAndCustomerId(
    commodityId: string,
    customerId: string,
    excludeId?: string,
  ): Promise<CommodityCustomerPriceEntity | null> {
    const queryBuilder = this.CommodityCustomerRepository.createQueryBuilder(
      'commodityCustomer',
    )
      .where('commodityCustomer.commodityId = :commodityId', { commodityId })
      .andWhere('commodityCustomer.customerId = :customerId', { customerId })
      .andWhere('commodityCustomer.deleted = :deleted', {
        deleted: GlobalStatusEnum.NO,
      });

    // 如果提供了excludeId，则排除该ID
    if (excludeId) {
      queryBuilder.andWhere('commodityCustomer.id != :excludeId', {
        excludeId,
      });
    }

    return await queryBuilder.getOne();
  }

  /**
   * 根据商品id查询列表
   */
  async getCommodityCustomerPriceListByCommodityId(
    commodityId: string,
  ): Promise<CommodityCustomerPriceResponseDto[]> {
    try {
      let queryBuilder =
        await this.CommodityCustomerRepository.createQueryBuilder(
          'commodityCustomer',
        )
          .select([
            'commodityCustomer.id as id',
            'commodityCustomer.commodity_id as commodityId',
            'commodity.commodity_barcode as commodityBarcode',
            `COALESCE(NULLIF(commodityCustomer.commodity_name, ''), commodity.commodity_name) as commodityName`,
            'commodityCustomer.commodity_internal_code as commodityInternalCode',
            'commodityCustomer.customer_id as customerId',
            'customer.customer_name as customerName',
            'commodityCustomer.item_ex_factory_price as itemExFactoryPrice',
            'commodityCustomer.is_supply_subsidy_involved as isSupplySubsidyInvolved',
            'commodityCustomer.is_quota_involved as isQuotaInvolved',
            'commodityCustomer.is_gift_eligible as isGiftEligible',
            'commodityCustomer.enabled as enabled',
            'commodityCustomer.creator_id as creatorId',
            'commodityCustomer.created_time as createdTime',
            'commodityCustomer.creator_name as creatorName',
          ])
          .leftJoin(
            CommodityInfoEntity,
            'commodity',
            'commodity.id=commodityCustomer.commodity_id',
          )
          .leftJoin(
            CustomerInfoEntity,
            'customer',
            'customer.id=commodityCustomer.customer_id',
          )
          .where('commodityCustomer.deleted = :deleted', {
            deleted: GlobalStatusEnum.NO,
          })
          .andWhere('commodityCustomer.commodity_id = :commodityId', {
            commodityId: commodityId,
          });

      queryBuilder = queryBuilder
        .orderBy('commodityCustomer.created_time', 'DESC')
        .addOrderBy('commodityCustomer.id', 'DESC');

      const items = await queryBuilder.getRawMany();

      return items;
    } catch (error) {
      throw new BusinessException('获取列表失败' + error.message);
    }
  }

  /**
   * 新增商品客户价格
   */
  async addCommodityCustomerPrice(
    priceData: CommodityCustomerPriceRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、判断该商品客户价格映射是否存在
      const exitData = await this.getDataByCommodityIdAndCustomerId(
        priceData.commodityId,
        priceData.customerId,
      );

      if (exitData) {
        throw new BusinessException('该商品客户价格映射已存在');
      }

      // 2、构建
      const commodityCustomer = new CommodityCustomerPriceEntity();

      // 3、设置信息
      commodityCustomer.id = generateId();

      // 4、判断客户id是否有效
      const customer = this.customerService.getCustomerBaseInfoById(
        priceData.customerId,
      );

      if (!customer) {
        throw new BusinessException('该客户不存在');
      }

      // 5、判断商品id是否有效
      const commodityInfo = await this.commodityService.getCommodityInfoById(
        priceData.commodityId,
      );

      if (!commodityInfo) {
        throw new BusinessException(`该商品不存在`);
      }
      commodityCustomer.commodityInternalCode =
        commodityInfo.commodityInternalCode;

      commodityCustomer.customerId = priceData.customerId;
      commodityCustomer.commodityId = priceData.commodityId;
      commodityCustomer.commodityName = priceData.commodityName;

      commodityCustomer.itemExFactoryPrice = String(
        priceData.itemExFactoryPrice,
      );
      commodityCustomer.isSupplySubsidyInvolved =
        priceData.isSupplySubsidyInvolved;
      commodityCustomer.isQuotaInvolved = priceData.isQuotaInvolved;
      commodityCustomer.isGiftEligible = priceData.isGiftEligible;
      commodityCustomer.enabled = priceData.enabled;

      // 6、默认
      commodityCustomer.deleted = GlobalStatusEnum.NO;

      // 7、设置创建时间
      commodityCustomer.creatorId = userPayload.userId;
      commodityCustomer.creatorName = userPayload.nickName;
      commodityCustomer.createdTime = dayjs().toDate();

      // 8、设置更新时间
      commodityCustomer.reviserId = userPayload.userId;
      commodityCustomer.reviserName = userPayload.nickName;
      commodityCustomer.revisedTime = dayjs().toDate();

      // 9、保存
      await this.CommodityCustomerRepository.save(commodityCustomer);
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 更新商品客户价格
   */
  async updateCommodityCustomerPrice(
    id: string,
    priceData: CommodityCustomerPriceRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、判断该商品客户价格映射是否存在
      const exitData = await this.getDataByCommodityIdAndCustomerId(
        priceData.commodityId,
        priceData.customerId,
        id,
      );

      if (exitData) {
        throw new BusinessException('该商品客户价格映射已存在');
      }

      // 2、构建
      const commodityCustomer = new CommodityCustomerPriceEntity();

      // 3、判断客户id是否有效
      const customer = this.customerService.getCustomerBaseInfoById(
        priceData.customerId,
      );

      if (!customer) {
        throw new BusinessException('该客户不存在');
      }

      // 4、判断商品id是否有效
      const commodityInfo = await this.commodityService.getCommodityInfoById(
        priceData.commodityId,
      );

      if (!commodityInfo) {
        throw new BusinessException(`该商品不存在`);
      }
      commodityCustomer.commodityInternalCode =
        commodityInfo.commodityInternalCode;

      commodityCustomer.customerId = priceData.customerId;
      commodityCustomer.commodityId = priceData.commodityId;
      commodityCustomer.commodityName = priceData.commodityName;

      commodityCustomer.itemExFactoryPrice = String(
        priceData.itemExFactoryPrice,
      );
      commodityCustomer.isSupplySubsidyInvolved =
        priceData.isSupplySubsidyInvolved;
      commodityCustomer.isQuotaInvolved = priceData.isQuotaInvolved;
      commodityCustomer.isGiftEligible = priceData.isGiftEligible;
      commodityCustomer.enabled = priceData.enabled;

      // 5、设置更新时间
      commodityCustomer.reviserId = userPayload.userId;
      commodityCustomer.reviserName = userPayload.nickName;
      commodityCustomer.revisedTime = dayjs().toDate();

      // 6、更新
      await this.CommodityCustomerRepository.update(id, commodityCustomer);
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 删除商品客户价格
   */
  async deleteCustomerCommodityPrices(
    id: string,
    user: JwtUserPayload,
  ): Promise<void> {
    await this.CommodityCustomerRepository.update(id, {
      deleted: GlobalStatusEnum.YES,
      revisedTime: dayjs().toDate(),
      reviserId: user.userId,
      reviserName: user.nickName,
    });
  }
}
