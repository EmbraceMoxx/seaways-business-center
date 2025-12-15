import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 客户管理
import { CustomerInfoEntity } from './entities/customer.entity';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';

// 客户月度额度信息
import { CustomerMonthlyCreditLimitEntity } from './entities/customer-monthly-credit-limit.entity';
import { CustomerMonthlyCreditLimitService } from './services/customer-monthly-credit-limit.server';

// 客户地址管理
import { CustomerAddressEntity } from './entities/customer-address.entity';
import { CustomerAddressController } from './controllers/customer-address.controller';
import { CustomerAddressService } from './services/customer-address.service';

// 客户额度管理
import { CustomerCreditAmountInfoEntity } from './entities/customer-credit-limit.entity';
import { CustomerCreditLimitController } from './controllers/customer-credit-limit.controller';
import { CustomerCreditLimitService } from './services/customer-credit-limit.service';

// 客户额度流水明细管理
import { CustomerCreditLimitDetailEntity } from './entities/customer-credit-limit-detail.entity';
import { CustomerCreditLimitDetailController } from './controllers/customer-credit-limit-detail.controller';
import { CustomerCreditLimitDetailService } from './services/customer-credit-limit-detail.service';

// 系统日志
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { BusinessLogEntity } from '@modules/common/business-log/entity/business-log.entity';

// 订单管理
import { UserService } from '@modules/common/user/user.service';

// 订单客户价格关联
import { CommodityCustomerPriceEntity } from '@modules/commodity/entities/commodity-customer-price.entity';
import { CommodityCustomerPriceService } from '@modules/commodity/services/commodity-customer-price.server';

// 商品管理
import { CommodityInfoEntity } from '@modules/commodity/entities/commodity-info.entity';
import { CommodityService } from '@modules/commodity/services/commodity.service';

// 商品分类
import { CommodityBundledSkuInfoEntity } from '@modules/commodity/entities/commodity-bundled-sku-info.entity';
import { CommodityCategoryEntity } from '@modules/commodity//entities/commodity-category.entity';
import { CustomerCommodityConfigEntity } from '@modules/commodity/entities/customer-commodity-config.entity';
import { CommodityCategoryService } from '@modules/commodity/services/commodity-category.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerInfoEntity,
      CustomerCreditAmountInfoEntity,
      CustomerMonthlyCreditLimitEntity,
      CustomerAddressEntity,
      CustomerCreditLimitDetailEntity,
      BusinessLogEntity,
      CommodityCustomerPriceEntity,
      CommodityInfoEntity,
      CommodityBundledSkuInfoEntity,
      CommodityCategoryEntity,
      CustomerCommodityConfigEntity,
    ]),
  ],
  providers: [
    CustomerService,
    CustomerCreditLimitService,
    CustomerAddressService,
    CustomerCreditLimitDetailService,
    BusinessLogService,
    UserService,
    CustomerMonthlyCreditLimitService,
    CommodityCustomerPriceService,
    CommodityService,
    CommodityCategoryService,
  ],
  controllers: [
    CustomerController,
    CustomerAddressController,
    CustomerCreditLimitController,
    CustomerCreditLimitDetailController,
  ],
  exports: [
    CustomerService,
    CustomerCreditLimitService,
    CustomerMonthlyCreditLimitService,
    CustomerCreditLimitDetailService,
  ],
})
export class CustomerModule {}
