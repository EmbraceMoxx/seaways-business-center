import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { QueryCustomerAddresstDto, CustomerAddressResponseDto } from '@src/dto';
import { CustomerInfoEntity } from '@modules/customer/customer.entity';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { CustomerAddressEntity } from '@modules/customer-address/customer-address.entity';

@Injectable()
export class CustomerAddressService {
  constructor(
    @InjectRepository(CustomerAddressEntity)
    private customerAddress: Repository<CustomerAddressEntity>,
  ) {}

  /**
   * 获取客户地址列表
   * @param params 查询参数
   */
  async getCustomerAddressPageList(
    params: QueryCustomerAddresstDto,
  ): Promise<{ items: CustomerAddressResponseDto[]; total: number }> {
    try {
      const { consigneeName, phone, searchKeyValue } = params;
      // 分页参数--页码、页数
      const page = Math.max(1, Number(params.page) || 1);
      const pageSize = Number(params.pageSize) || 20;

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
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = await queryBuilder.getRawMany();

      return { items, total };
    } catch (error) {
      throw new BusinessException('获取客户地址管理列表失败' + error.message);
    }
  }
}
