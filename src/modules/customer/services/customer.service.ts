import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  CustomerInfoCreditResponseDto,
  CustomerInfoResponseDto,
  CustomerRequestDto,
  QueryCustomerDto,
  CommodityCustomerPriceRequestDto,
  CommodityCustomerPriceResponseDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { UserEndpoints } from '@src/constants/index';
import { forwardRef, Inject } from '@nestjs/common';
import { generateId } from '@src/utils';
import * as dayjs from 'dayjs';
import { HttpProxyService } from '@shared/http-proxy.service';
import { CustomerLogHelper } from '../helper/customer.log.helper';

import { CustomerInfoEntity } from '../entities/customer.entity';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { UserService } from '@modules/common/user/user.service';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CommodityCustomerPriceService } from '@modules/commodity/services/commodity-customer-price.server';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerInfoEntity)
    private customerRepository: Repository<CustomerInfoEntity>,
    @Inject(forwardRef(() => CustomerCreditLimitService))
    private customerCreditLimitService: CustomerCreditLimitService,
    private businessLogService: BusinessLogService,
    private userService: UserService,
    private httpProxyServices: HttpProxyService,
    private commodityService: CommodityService,
    private commodityCustomerPriceService: CommodityCustomerPriceService,
    private dataSource: DataSource,
  ) {}

  /**
   * 获取客户列表
   */
  async getCustomerList(
    params: QueryCustomerDto,
    user: JwtUserPayload,
    token: string,
  ): Promise<{ items: CustomerInfoResponseDto[]; total: number }> {
    try {
      const {
        customerName,
        provincialHead,
        regionalHead,
        region,
        customerType,
        page,
        pageSize,
      } = params;

      let queryBuilder = this.customerRepository
        .createQueryBuilder('customer')
        .select([
          'customer.id as id',
          'customer.customer_name as customerName',
          'customer.customer_type as customerType',
          'customer.region as region',
          'customer.provincial_head as provincialHead',
          'customer.provincial_head_id as provincialHeadId',
          'customer.regional_head as regionalHead',
          'customer.regional_head_id as regionalHeadId',
          'customer.principal_user_id as principalUserId',
          'customer.province as province',
          'customer.city as city',
          'customer.distributor_type as distributorType',
          'customer.is_contract as isContract',
          'customer.co_status as coStatus',
          'customer.is_earnest_money as isEarnestMoney',
          'customer.enabled as enabled',
          'customer.deleted as deleted',
          'customer.creator_id as creatorId',
          'customer.created_time as createdTime',
          'customer.creator_name as creatorName',
          'customer.reviser_id as reviserId',
          'customer.revised_time as revisedTime',
          'customer.reviser_name as reviserName',
        ])
        .where('customer.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        });

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'customer.customer_name LIKE :customerName',
          {
            customerName: `%${customerName}%`,
          },
        );
      }

      // 大区负责人
      if (regionalHead) {
        queryBuilder = queryBuilder.andWhere(
          'customer.regional_head LIKE :regionalHead',
          {
            regionalHead: `%${regionalHead}%`,
          },
        );
      }

      // 省区负责人
      if (provincialHead) {
        queryBuilder = queryBuilder.andWhere(
          'customer.provincial_head LIKE :provincialHead',
          {
            provincialHead: `%${provincialHead}%`,
          },
        );
      }

      // 客户所属区域
      if (region) {
        queryBuilder = queryBuilder.andWhere('customer.region = :region', {
          region,
        });
      }

      // 类型
      if (customerType) {
        queryBuilder = queryBuilder.andWhere(
          'customer.customer_type = :customerType',
          {
            customerType,
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
        // 收集所有人负责的客户ID，去查询对应的客户ID
        const customerIds = await this.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return { items: [], total: 0 };
        }

        queryBuilder = queryBuilder.andWhere('customer.id IN (:customerIds)', {
          customerIds,
        });
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('customer.created_time', 'DESC')
        .addOrderBy('customer.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户列表失败' + error.message);
    }
  }

  /**
   * 获取选择客户列表
   */
  async getSelectCustomerList(
    params: QueryCustomerDto,
    user: JwtUserPayload,
    token: string,
  ): Promise<{ items: CustomerInfoResponseDto[]; total: number }> {
    try {
      const {
        customerName,
        provincialHead,
        regionalHead,
        region,
        customerType,
        page,
        pageSize,
      } = params;

      let queryBuilder = this.customerRepository
        .createQueryBuilder('customer')
        .select([
          'customer.id as id',
          'customer.customer_name as customerName',
          'customer.customer_type as customerType',
          'customer.region as region',
          'customer.provincial_head as provincialHead',
          'customer.provincial_head_id as provincialHeadId',
          'customer.regional_head as regionalHead',
          'customer.regional_head_id as regionalHeadId',
          'customer.principal_user_id as principalUserId',
          'customer.province as province',
          'customer.city as city',
          'customer.created_time as createdTime',
          'customer.creator_name as creatorName',
        ])
        .where('customer.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .andWhere('customer.enabled = :enabled', {
          enabled: GlobalStatusEnum.YES,
        })
        .andWhere('customer.is_contract = :isContract', {
          isContract: 1,
        })
        .andWhere('customer.co_status = :coStatus', {
          coStatus: '1',
        })
        .andWhere('customer.customer_type > :customerType', {
          customerType: 0,
        });

      // 客户名称
      if (customerName) {
        queryBuilder = queryBuilder.andWhere(
          'customer.customer_name LIKE :customerName',
          {
            customerName: `%${customerName}%`,
          },
        );
      }

      // 大区负责人
      if (regionalHead) {
        queryBuilder = queryBuilder.andWhere(
          'customer.regional_head LIKE :regionalHead',
          {
            regionalHead: `%${regionalHead}%`,
          },
        );
      }

      // 省区负责人
      if (provincialHead) {
        queryBuilder = queryBuilder.andWhere(
          'customer.provincial_head LIKE :provincialHead',
          {
            provincialHead: `%${provincialHead}%`,
          },
        );
      }

      // 客户所属区域
      if (region) {
        queryBuilder = queryBuilder.andWhere('customer.region = :region', {
          region,
        });
      }

      // 类型
      if (customerType) {
        queryBuilder = queryBuilder.andWhere(
          'customer.customer_type = :customerType',
          {
            customerType,
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
        // 收集所有人负责的客户ID，去查询对应的客户ID
        const customerIds = await this.getManagedCustomerIds(
          checkResult.principalUserIds,
        );

        // 如果没有客户ID，则返回空
        if (!customerIds.length) {
          return { items: [], total: 0 };
        }

        queryBuilder = queryBuilder.andWhere('customer.id IN (:customerIds)', {
          customerIds,
        });
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('customer.created_time', 'DESC')
        .addOrderBy('customer.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户列表失败' + error.message);
    }
  }
  /**
   * 获取客户详情
   */
  async getCustomerInfoCreditById(id: string): Promise<
    CustomerInfoResponseDto & {
      creditInfo: CustomerInfoCreditResponseDto;
      commodityList: CommodityCustomerPriceResponseDto[];
    }
  > {
    try {
      // 1、查询详情
      const customerInfo = await this.getCustomerBaseInfoById(id);
      if (!customerInfo) {
        throw new BusinessException('客户不存在');
      }

      // 2、获取客户额度详情-额度信息
      const creditInfo =
        await this.customerCreditLimitService.getCustomerCreditInfo(id);

      // 3、获取商品客户价格列表并进行类型适配
      const rawCommodityList =
        await this.commodityCustomerPriceService.getCommodityCustomerPriceList(
          id,
        );

      const commodityList: CommodityCustomerPriceResponseDto[] =
        rawCommodityList.map((item) => ({
          ...item,
          itemExFactoryPrice: Number(item.itemExFactoryPrice),
        }));

      return { ...customerInfo, creditInfo, commodityList };
    } catch (error) {
      throw new BusinessException('获取客户详情失败');
    }
  }

  /**
   * 根据客户ID获取客户基本信息
   * @param id
   * @returns
   */
  public async getCustomerBaseInfoById(
    id: string,
  ): Promise<CustomerInfoEntity | null> {
    return await this.customerRepository.findOne({
      where: {
        id,
        deleted: GlobalStatusEnum.NO,
        enabled: GlobalStatusEnum.YES,
      },
    });
  }

  /**
   * 根据客户名称获取客户基本信息
   * @param customerName 客户名称
   * @param excludeId 排除的客户ID（用于更新时排除自己）
   */
  public async getCustomerBaseInfoByName(
    customerName: string,
    excludeId?: string,
  ): Promise<CustomerInfoEntity | null> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.customerName = :customerName', { customerName })
      .andWhere('customer.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
      .andWhere('customer.enabled = :enabled', {
        enabled: GlobalStatusEnum.YES,
      });

    // 如果提供了excludeId，则排除该ID的客户
    if (excludeId) {
      queryBuilder.andWhere('customer.id != :excludeId', { excludeId });
    }

    return await queryBuilder.getOne();
  }

  /**
   * 更新客户
   */
  async updateCustomerInfo(
    customerId: string,
    customerData: CustomerRequestDto,
    user: JwtUserPayload,
    token: string,
  ) {
    try {
      // 1、获判断客户是否存在
      const customerInfo = await this.getCustomerInfoCreditById(customerId);
      if (!customerInfo) {
        throw new BusinessException('客户不存在');
      }

      // 2、判断是否重名（排除自己）
      const existingCustomer = await this.getCustomerBaseInfoByName(
        customerData.customerName,
        customerId,
      );
      if (existingCustomer) {
        throw new BusinessException(`【${customerData.customerName}】已存在`);
      }

      return await this.dataSource.transaction(async (manager) => {
        // 3、更新客户信息
        const customer = new CustomerInfoEntity();

        customer.id = customerId;

        // 4、大区负责人
        if (customerData?.regionalHeadId) {
          // 3.1、判断大区负责人id是否有效
          const userExit = await this.httpProxyServices.get(
            UserEndpoints.USER_by_id(customerData?.regionalHeadId),
            token,
          );

          if (!userExit) {
            throw new BusinessException('大区负责人无效');
          }
          customer.regionalHead = userExit?.nickName;
          customer.regionalHeadId = customerData?.regionalHeadId;
        }

        // 5、省区负责人
        if (customerData?.provincialHeadId) {
          // 4.1、判断省区负责人id是否有效
          const userExit = await this.httpProxyServices.get(
            UserEndpoints.USER_by_id(customerData?.provincialHeadId),
            token,
          );

          if (!userExit) {
            throw new BusinessException('省区负责人无效');
          }
          customer.provincialHead = userExit?.nickName;
          customer.provincialHeadId = customerData?.provincialHeadId;
        }

        // 6、客户负责销售ID
        if (customerData?.principalUserId) {
          // 5.1、判断客户负责销售ID是否有效
          const userExit = await this.httpProxyServices.get(
            UserEndpoints.USER_by_id(customerData?.principalUserId),
            token,
          );

          if (!userExit) {
            throw new BusinessException('客户负责销售无效');
          }
          customer.principalUserId = customerData?.principalUserId;
        }

        customer.customerJstId = customerData?.customerJstId;
        customer.customerType = customerData?.customerType;
        customer.isEarnestMoney = customerData?.isEarnestMoney;
        customer.distributorType = customerData?.distributorType;
        customer.contractValidityPeriod = customerData?.contractValidityPeriod;

        // 7、合同有效期存在则修改为已签订
        if (customerData?.contractValidityPeriod) {
          customer.isContract = 1;
        }

        customer.contractAmount = customerData?.contractAmount
          ? String(customerData?.contractAmount)
          : null;
        customer.reconciliationMail = customerData?.reconciliationMail;
        customer.coStatus = customerData?.coStatus;

        // 8、处理客户关联的商品列表
        await this.processCustomerCommodityList(
          customer.id,
          customerData.commodityList,
          user,
          manager,
        );

        // 9、当前更新人信息
        customer.reviserId = user.userId;
        customer.reviserName = user.nickName;
        customer.revisedTime = dayjs().toDate();

        // 10、执行更新
        await manager.update(CustomerInfoEntity, { id: customerId }, customer);

        // 11、写入操作日志
        const logInput = CustomerLogHelper.getCustomerOperate(
          user,
          'CustomerService.updateCustomerInfo',
          customerId,
          customerInfo.customerName,
        );
        logInput.params = customer;
        this.businessLogService.writeLog(logInput, manager);
      });
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }
  async getManagedCustomerIds(userIds: string[]): Promise<string[]> {
    const userCustomerRelation = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.principalUserId IN (:...userIds)', { userIds })
      .andWhere('customer.deleted = :deleted', { deleted: GlobalStatusEnum.NO })
      .getMany();
    return userCustomerRelation.map((relation) => relation.id);
  }

  /**
   * 处理客户关联的商品列表
   * @param customerId 客户ID
   * @param commodityList 商品列表
   */
  private async processCustomerCommodityList(
    customerId: string,
    commodityList: CommodityCustomerPriceRequestDto[],
    user: JwtUserPayload,
    manager: EntityManager,
  ) {
    // 1、查询该编码是否存在，并查出商品id和商品名
    for (const item of commodityList) {
      const commodityInfo =
        await this.commodityService.getCommodityInfoByInternalCode(
          item.commodityInternalCode,
        );

      if (!commodityInfo) {
        throw new BusinessException(
          `商品内部编码 ${item.commodityInternalCode} 不存在或不可用`,
        );
      }

      // 1.2 赋值商品信息
      item.commodityId = commodityInfo.id;
    }

    // 7、保存commodityList至商品价格客户映射表
    await this.commodityCustomerPriceService.addCommodityCustomerPrice(
      customerId,
      commodityList,
      user,
      manager,
    );
  }

  /**
   * 新增客户
   */
  async addCustomer(
    customerData: CustomerRequestDto,
    user: JwtUserPayload,
    token: string,
  ) {
    try {
      // 1、判断是否重名
      const customerExit = await this.getCustomerBaseInfoByName(
        customerData.customerName,
      );

      if (customerExit) {
        throw new BusinessException(`【${customerData.customerName}】已存在`);
      }

      return await this.dataSource.transaction(async (manager) => {
        // 2、构建客户信息
        const customer = new CustomerInfoEntity();

        // 3、生成客户ID
        customer.id = generateId();

        // 4、大区负责人
        if (customerData?.regionalHeadId) {
          // 3.1、判断大区负责人id是否有效
          const userExit = await this.httpProxyServices.get(
            UserEndpoints.USER_by_id(customerData?.regionalHeadId),
            token,
          );

          if (!userExit) {
            throw new BusinessException('大区负责人无效');
          }
          customer.regionalHead = userExit?.nickName;
          customer.regionalHeadId = customerData?.regionalHeadId;
        }

        // 5、省区负责人
        if (customerData?.provincialHeadId) {
          // 4.1、判断省区负责人id是否有效
          const userExit = await this.httpProxyServices.get(
            UserEndpoints.USER_by_id(customerData?.provincialHeadId),
            token,
          );

          if (!userExit) {
            throw new BusinessException('省区负责人无效');
          }
          customer.provincialHead = userExit?.nickName;
          customer.provincialHeadId = customerData?.provincialHeadId;
        }

        // 6、客户负责销售ID
        if (customerData?.principalUserId) {
          // 5.1、判断客户负责销售ID是否有效
          const userExit = await this.httpProxyServices.get(
            UserEndpoints.USER_by_id(customerData?.principalUserId),
            token,
          );

          if (!userExit) {
            throw new BusinessException('客户负责销售无效');
          }
          customer.principalUserId = customerData?.principalUserId;
        }

        customer.customerName = customerData?.customerName;
        customer.region = customerData?.region;
        customer.province = customerData?.province;
        customer.city = customerData?.city;
        customer.customerJstId = customerData?.customerJstId;
        customer.customerType = customerData?.customerType;
        customer.isEarnestMoney = customerData?.isEarnestMoney;
        customer.distributorType = customerData?.distributorType;
        customer.contractValidityPeriod = customerData?.contractValidityPeriod;

        // 7、合同有效期存在则修改为已签订
        if (customerData?.contractValidityPeriod) {
          customer.isContract = 1;
        }

        customer.contractAmount = customerData?.contractAmount
          ? String(customerData?.contractAmount)
          : null;
        customer.reconciliationMail = customerData?.reconciliationMail;
        customer.coStatus = customerData?.coStatus;

        // 8、处理客户关联的商品列表
        await this.processCustomerCommodityList(
          customer.id,
          customerData.commodityList,
          user,
          manager,
        );

        // 9、默认
        customer.enabled = GlobalStatusEnum.YES;
        customer.deleted = GlobalStatusEnum.NO;

        // 10、设置创建时间
        customer.creatorId = user.userId;
        customer.creatorName = user.nickName;
        customer.createdTime = dayjs().toDate();

        // 11、当前更新人信息
        customer.reviserId = user.userId;
        customer.reviserName = user.nickName;
        customer.revisedTime = dayjs().toDate();

        // 12、执行新增
        await manager.save(CustomerInfoEntity, customer);

        // 13、写入操作日志
        const logInput = CustomerLogHelper.getCustomerOperate(
          user,
          'CustomerService.updateCustomerInfo',
          customer.id,
          customer.customerName,
        );
        logInput.params = customer;
        this.businessLogService.writeLog(logInput, manager);
      });
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }
}
