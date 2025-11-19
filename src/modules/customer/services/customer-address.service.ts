import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  QueryCustomerAddressDto,
  CustomerAddressResponseDto,
  CustomerAddressRequestDto,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerInfoEntity } from '../entities/customer.entity';
import { CustomerAddressEntity } from '../entities/customer-address.entity';
import { CustomerService } from '../services/customer.service';

@Injectable()
export class CustomerAddressService {
  constructor(
    @InjectRepository(CustomerAddressEntity)
    private customerAddress: Repository<CustomerAddressEntity>,
    private customerService: CustomerService,
  ) {}

  /**
   * 获取客户地址列表
   * @param params 查询参数
   */
  async getCustomerAddressPageList(
    params: QueryCustomerAddressDto,
  ): Promise<{ items: CustomerAddressResponseDto[]; total: number }> {
    try {
      const { consigneeName, phone, searchKeyValue, page, pageSize } = params;

      let queryBuilder = this.customerAddress
        .createQueryBuilder('customerAddress')
        .select([
          'customerAddress.id as id',
          'customerAddress.customer_id as customerId',
          'customer.customer_name as customerName',
          'customerAddress.province as province',
          'customerAddress.city as city',
          'customerAddress.district as district',
          'customerAddress.address as address',
          'customerAddress.consignee_name as consigneeName',
          'customerAddress.phone as phone',
          'customerAddress.is_default as isDefault',
          'customerAddress.enabled as enabled',
          'customerAddress.creator_id as creatorId',
          'customerAddress.creator_name as creatorName',
          'customerAddress.created_time as createdTime',
          'customerAddress.reviser_id as reviserId',
          'customerAddress.reviser_name as reviserName',
          'customerAddress.revised_time as revisedTime',
        ])
        .where('customerAddress.deleted = :deleted', {
          deleted: GlobalStatusEnum.NO,
        })
        .leftJoin(
          CustomerInfoEntity,
          'customer',
          'customer.id = customerAddress.customer_id',
        );

      // 地址：省份(province)或城市(city)或区县(district)或详细地址(address)的模糊匹配
      if (searchKeyValue) {
        queryBuilder = queryBuilder.andWhere(
          'customerAddress.province LIKE :searchKeyValue OR customerAddress.city LIKE :searchKeyValue OR customerAddress.district LIKE :searchKeyValue OR customerAddress.address LIKE :searchKeyValue',
          {
            searchKeyValue: `%${searchKeyValue}%`,
          },
        );
      }

      // 收货人姓名
      if (consigneeName) {
        queryBuilder = queryBuilder.andWhere(
          'customerAddress.consignee_name LIKE :consigneeName',
          {
            consigneeName: `%${consigneeName}%`,
          },
        );
      }

      // 联系电话
      if (phone) {
        queryBuilder = queryBuilder.andWhere(
          'customerAddress.phone LIKE :phone',
          {
            phone: `%${phone}%`,
          },
        );
      }

      // 执行计数查询
      const countQueryBuilder = queryBuilder.clone();
      const total = await countQueryBuilder.getCount();

      queryBuilder = queryBuilder
        .orderBy('customerAddress.created_time', 'DESC')
        .orderBy('customerAddress.id', 'DESC')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户地址管理列表失败' + error.message);
    }
  }

  /**
   * 新增客户地址
   * @param creditParam 客户地址信息
   * @param userPayload 用户信息
   */
  async addCustomerAddress(
    customerAddressParam: CustomerAddressRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、获取客户信息
      const customer = await this.customerService.getCustomerInfoCreditById(
        customerAddressParam?.customerId,
      );
      if (!customer) {
        throw new BusinessException('客户Id不存在');
      }

      // 创建新的客户地址实体
      const customerAddressDetail = new CustomerAddressEntity();

      // 2、查询该客户下是否有地址列表且不传isDefault，没有则默认为1
      const isExist = await this.customerAddress.findOne({
        where: {
          customerId: customerAddressParam.customerId,
          deleted: GlobalStatusEnum.NO,
          enabled: GlobalStatusEnum.YES,
        },
      });
      if (!isExist && !customerAddressParam?.isDefault) {
        customerAddressDetail.isDefault = 1;
      } else if (!customerAddressParam?.isDefault) {
        customerAddressDetail.isDefault = 0;
      } else {
        customerAddressDetail.isDefault = customerAddressParam.isDefault;
      }

      // 3、检查客户地址默认地址已存在，即同一个客户下的地址只有一个地址的is_default为1
      const isSefaultExist = await this.customerAddress.findOne({
        where: {
          customerId: customerAddressParam.customerId,
          isDefault: 1,
          deleted: GlobalStatusEnum.NO,
        },
      });
      if (customerAddressParam.isDefault === 1 && isSefaultExist) {
        throw new BusinessException('同一个客户下的地址只能有一个默认地址');
      }

      customerAddressDetail.customerId = customerAddressParam.customerId;
      customerAddressDetail.province = customerAddressParam.province;
      customerAddressDetail.city = customerAddressParam.city;
      customerAddressDetail.district = customerAddressParam.district;
      customerAddressDetail.address = customerAddressParam.address;
      customerAddressDetail.consigneeName = customerAddressParam.consigneeName;
      customerAddressDetail.phone = customerAddressParam.phone;

      // 3、默认
      customerAddressDetail.enabled = GlobalStatusEnum.YES;
      customerAddressDetail.deleted = GlobalStatusEnum.NO;

      // 5、设置创建时间
      customerAddressDetail.creatorId = userPayload.userId;
      customerAddressDetail.creatorName = userPayload.username;
      customerAddressDetail.createdTime = dayjs().toDate();

      // 6、设置更新时间
      customerAddressDetail.reviserId = userPayload.userId;
      customerAddressDetail.reviserName = userPayload.username;
      customerAddressDetail.revisedTime = dayjs().toDate();

      return await this.customerAddress.save(customerAddressDetail);
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 修改客户地址
   * @param id 客户地址id
   * @param creditParam 客户地址信息
   * @param userPayload 用户信息
   */
  async updatCustomerAddress(
    id: string,
    customerAddressParam: CustomerAddressRequestDto,
    userPayload: JwtUserPayload,
  ) {
    try {
      // 1、判断客户地址id是否存在
      const customerAddress = await this.customerAddress.findOne({
        where: {
          id,
          deleted: GlobalStatusEnum.NO,
        },
      });
      if (!customerAddress) {
        throw new BusinessException('客户地址Id不存在');
      }

      // 2、检查客户地址默认地址已存在，即同一个客户下的地址只有一个地址的is_default为1
      const isSefaultExist = await this.customerAddress.findOne({
        where: {
          customerId: customerAddressParam.customerId,
          isDefault: 1,
          deleted: GlobalStatusEnum.NO,
        },
      });
      if (customerAddressParam.isDefault === 1 && isSefaultExist) {
        throw new BusinessException('同一个客户下的地址只能有一个默认地址');
      }

      // 3、创建新的客户地址实体
      const customerAddressDetail = new CustomerAddressEntity();

      customerAddressDetail.customerId = customerAddressParam.customerId;
      customerAddressDetail.province = customerAddressParam.province;
      customerAddressDetail.city = customerAddressParam.city;
      customerAddressDetail.district = customerAddressParam.district;
      customerAddressDetail.address = customerAddressParam.address;
      customerAddressDetail.consigneeName = customerAddressParam.consigneeName;
      customerAddressDetail.phone = customerAddressParam.phone;
      customerAddressDetail.isDefault = customerAddressParam.isDefault;

      // 4、设置更新时间
      customerAddressDetail.reviserId = userPayload.userId;
      customerAddressDetail.reviserName = userPayload.username;
      customerAddressDetail.revisedTime = dayjs().toDate();

      // 5、更新客户地址
      await this.customerAddress.update(id, customerAddressDetail);
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 删除客户地址
   * @param id 客户地址id
   */
  async deleteCustomerAddress(id: string) {
    try {
      // 1、判断客户地址id是否存在
      const customerAddress = await this.customerAddress.findOne({
        where: {
          id,
          deleted: GlobalStatusEnum.NO,
        },
      });
      if (!customerAddress) {
        throw new BusinessException('客户地址Id不存在');
      }

      // 2、删除客户地址
      await this.customerAddress.update(id, {
        deleted: GlobalStatusEnum.YES,
      });
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }

  /**
   * 获取客户地址详情
   * @param id 客户地址id
   */
  async getCustomerAddressInfo(id: string) {
    try {
      // 1、判断客户地址id是否存在
      const customerAddress = await this.customerAddress.findOne({
        where: {
          id,
          deleted: GlobalStatusEnum.NO,
          enabled: GlobalStatusEnum.YES,
        },
      });
      if (!customerAddress) {
        throw new BusinessException('客户地址Id不存在');
      }

      // 2、获取客户信息
      const customer = await this.customerService.getCustomerInfoCreditById(
        customerAddress?.customerId,
      );
      return { ...customerAddress, customerName: customer?.customerName };
    } catch (error) {
      throw new BusinessException(error.message);
    }
  }
}
