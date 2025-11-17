import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  CustomerInfoResponseDto,
  CustomerInfoCreditResponseDto,
  CustomerInfoUpdateDto,
  QueryCustomerDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerInfoEntity } from '../entities/customer.entity';
import { CustomerCreditLimitService } from '../services/customer-credit-limit.service';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerInfoEntity)
    private customerRepository: Repository<CustomerInfoEntity>,
    private customerCreditLimitService: CustomerCreditLimitService,
  ) {}

  /**
   * 获取客户列表
   */
  async getCustomerList(
    params: QueryCustomerDto,
  ): Promise<{ items: CustomerInfoResponseDto[]; total: number }> {
    try {
      const {
        customerName,
        provincialHead,
        regionalHead,
        region,
        customerType,
        principalUserId,
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
          'customer.province as province',
          'customer.principal_user_id as principalUserId',
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

      // 客户负责人-销售ID
      if (principalUserId) {
        queryBuilder = queryBuilder.andWhere(
          'customer.principal_user_id LIKE :principalUserId',
          {
            principalUserId: `%${principalUserId}%`,
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

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('customer.created_time', 'DESC')
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
  async getCustomerInfoById(id: string): Promise<
    CustomerInfoResponseDto & {
      creditInfo: CustomerInfoCreditResponseDto;
    }
  > {
    try {
      // 查询详情
      const customerInfo = await this.customerRepository.findOne({
        where: {
          id,
          deleted: GlobalStatusEnum.NO,
        },
      });
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

  /**
   * 更新客户
   */
  async updateCustomerInfo(
    customerId: string,
    customerData: CustomerInfoUpdateDto,
    user: JwtUserPayload,
  ) {
    try {
      // 1、获判断客户是否存在
      const customerInfo = await this.getCustomerInfoById(customerId);
      if (!customerInfo) {
        throw new BusinessException('客户不存在');
      }
      // 2、更新客户信息
      const customer = new CustomerInfoEntity();
      customer.id = customerId;
      customer.regionalHead = customerData?.regionalHead;
      customer.regionalHeadId = customerData?.regionalHeadId;
      customer.provincialHead = customerData?.provincialHead;
      customer.provincialHeadId = customerData?.provincialHeadId;
      customer.distributorType = customerData?.distributorType;
      customer.contractValidityPeriod = customerData?.contractValidityPeriod;
      customer.contractAmount = customerData?.contractAmount
        ? String(customerData?.contractAmount)
        : null;
      customer.reconciliationMail = customerData?.reconciliationMail;
      customer.coStatus = customerData?.coStatus;

      // 3、当前更新人信息
      customer.reviserId = user.userId;
      customer.reviserName = user.username;
      customer.revisedTime = dayjs().toDate();

      // 4、执行更新
      await this.customerRepository.update(customerId, customer);
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }
}
