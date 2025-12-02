import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  CustomerInfoCreditResponseDto,
  CustomerInfoResponseDto,
  CustomerInfoUpdateDto,
  QueryCustomerDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerInfoEntity } from '../entities/customer.entity';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';
import { CustomerLogHelper } from '../helper/customer.log.helper';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { UserService } from '@modules/common/user/user.service';
import { HttpProxyService } from '@shared/http-proxy.service';
import { UserEndpoints } from '@src/constants/index';
import { forwardRef, Inject } from '@nestjs/common';

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
        .orderBy('customer.id', 'DESC')
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
        // todo 未签订合同，但是属于合作状态，目前允许下单
        // .andWhere('customer.is_contract = :isContract', {
        //   isContract: 1,
        // })
        .andWhere('customer.co_status = :coStatus', {
          coStatus: '1',
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
        .orderBy('customer.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户列表失败' + error.message);
    }
  }
  /**
   * 获取客户额详情
   */
  async getCustomerInfoCreditById(id: string): Promise<
    CustomerInfoResponseDto & {
      creditInfo: CustomerInfoCreditResponseDto;
    }
  > {
    try {
      // 查询详情
      const customerInfo = await this.getCustomerBaseInfoById(id);
      if (!customerInfo) {
        throw new BusinessException('客户不存在');
      }

      // 获取客户额度详情-额度信息
      const creditInfo =
        await this.customerCreditLimitService.getCustomerCreditInfo(id);

      return { ...customerInfo, creditInfo };
    } catch (error) {
      throw new BusinessException('获取客户详情失败');
    }
  }

  public async getCustomerBaseInfoById(
    id: string,
  ): Promise<CustomerInfoEntity> {
    return await this.customerRepository.findOne({
      where: {
        id,
        deleted: GlobalStatusEnum.NO,
      },
    });
  }

  /**
   * 更新客户
   */
  async updateCustomerInfo(
    customerId: string,
    customerData: CustomerInfoUpdateDto,
    user: JwtUserPayload,
    token: string,
  ) {
    try {
      // 1、获判断客户是否存在
      const customerInfo = await this.getCustomerInfoCreditById(customerId);
      if (!customerInfo) {
        throw new BusinessException('客户不存在');
      }
      // 2、更新客户信息
      const customer = new CustomerInfoEntity();
      customer.id = customerId;
      // 3、大区负责人
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

      // 4、省区负责人
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

      customer.distributorType = customerData?.distributorType;
      customer.contractValidityPeriod = customerData?.contractValidityPeriod;
      customer.contractAmount = customerData?.contractAmount
        ? String(customerData?.contractAmount)
        : null;
      customer.reconciliationMail = customerData?.reconciliationMail;
      customer.coStatus = customerData?.coStatus;

      // 5、当前更新人信息
      customer.reviserId = user.userId;
      customer.reviserName = user.nickName;
      customer.revisedTime = dayjs().toDate();

      // 6、执行更新
      await this.customerRepository.update(customerId, customer);

      // 7、写入操作日志
      const logInput = CustomerLogHelper.getCustomerOperate(
        user,
        'CustomerService.updateCustomerInfo',
        customerId,
        customerInfo.customerName,
      );
      logInput.params = customer;
      this.businessLogService.writeLog(logInput);
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
}
