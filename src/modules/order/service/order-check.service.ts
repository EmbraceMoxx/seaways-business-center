import { Injectable, Logger } from '@nestjs/common';
import {
  BusinessException,
  CancelOrderRequest,
  CheckOrderAmountResponse,
  OrderItem,
  OrderOperateButton,
} from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { UserService } from '@modules/common/user/user.service';
import {
  BooleanStatusEnum,
  GlobalStatusEnum,
} from '@src/enums/global-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { Repository } from 'typeorm';
import { CustomerService } from '@modules/customer/services/customer.service';
import { CustomerInfoEntity } from '@modules/customer/entities/customer.entity';
import { OrderConvertHelper } from '@modules/order/helper/order.convert.helper';
import { CommodityService } from '@modules/commodity/services/commodity.service';
import { CustomerCreditAmountInfoEntity } from '@modules/customer/entities/customer-credit-limit.entity';
import {
  AuxiliarySalesRatioValidationStrategy,
  RegionQuotaValidationStrategy,
  ReplenishRatioValidationStrategy,
  ValidationStrategy,
} from '@modules/order/strategy/order-validation.interface';

@Injectable()
export class OrderCheckService {
  private readonly logger = new Logger(OrderCheckService.name);

  constructor(
    private userService: UserService,
    @InjectRepository(OrderMainEntity)
    private orderRepository: Repository<OrderMainEntity>,
    @InjectRepository(CustomerCreditAmountInfoEntity)
    private creditAmountInfoRepository: Repository<CustomerCreditAmountInfoEntity>,
    private customerService: CustomerService,
    private commodityService: CommodityService,
  ) {}
  async checkOrderExist(orderId: string) {
    const orderMain = await this.orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) {
      throw new BusinessException('订单不存在或已被删除');
    }
    return orderMain;
  }
  /**
   * 检查客户信息是否符合要求
   * @returns 客户基本信息对象
   * @param customerId
   */
  async checkCustomerInfo(customerId: string) {
    const customerInfo = await this.customerService.getCustomerBaseInfoById(
      customerId,
    );
    if (!customerInfo) {
      this.logger.warn(`客户信息不存在，customerId: ${customerId}`);
      throw new BusinessException('客户信息不存在！');
    }
    if (String(BooleanStatusEnum.FALSE) === customerInfo.coStatus) {
      this.logger.warn(`客户合作状态为，coStatus: ${customerInfo.coStatus}`);
      throw new BusinessException('当前客户不属于合作状态，请确认！');
    }
    // todo 这个限制过于严格需要二次确认
    if (BooleanStatusEnum.FALSE === customerInfo.isContract) {
      this.logger.warn(
        `客户合同签订状态为，isContract: ${customerInfo.isContract}`,
      );
      throw new BusinessException('当前客户未签订合同，请确认！');
    }
    return customerInfo;
  }

  // 获取订单状态
  async calculateOrderStatus(
    response: CheckOrderAmountResponse,
    user: JwtUserPayload,
    customerInfo: CustomerInfoEntity,
  ): Promise<string> {
    // 获取金额额度，若额度过低则无需审批进入待确认回款
    const auxiliarySalesRatio = Number(response.auxiliarySalesRatio) || 0;
    const replenishRatio = Number(response.replenishRatio) || 0;
    // 当前操作人是否为客户负责人
    const flag = user.userId === customerInfo.principalUserId;
    this.logger.log(`当前操作人是否为客户负责人：${flag}`);
    // 当比例小于3% +5% 时，免审批，进入待回款状态
    if (auxiliarySalesRatio <= 0.003 && replenishRatio <= 0.05 && flag) {
      this.logger.log(
        `当前货补比例为:${replenishRatio},辅销比例为：${auxiliarySalesRatio},无需审批！`,
      );
      return OrderStatusEnum.PENDING_PAYMENT;
    }
    // 判断客户负责人，当前客户若存在省区负责人
    if (customerInfo.provincialHeadId) {
      this.logger.log(
        `当前货补比例为:${replenishRatio},辅销比例为：${auxiliarySalesRatio},省区负责人为：${customerInfo.provincialHeadId},需要审批！`,
      );
      // 当省区负责人不为空，比例校验不通过，则需要逐级审批，下一级为大区审批
      return OrderStatusEnum.REGION_REVIEWING;
    }
    // 当客户不存在省区负责人，而存在大区负责人时
    if (
      customerInfo.regionalHeadId &&
      customerInfo.provincialHeadId === undefined
    ) {
      // 当客户存在大区负责人，则判断比例小于 10% + 3% 则免审批
      if (auxiliarySalesRatio <= 0.003 && replenishRatio <= 0.1) {
        return OrderStatusEnum.PENDING_PAYMENT;
      } else {
        this.logger.log(
          `当前货补比例为:${replenishRatio},辅销比例为：${auxiliarySalesRatio},大区负责人为：${customerInfo.regionalHeadId},需要审批！`,
        );
        return OrderStatusEnum.DIRECTOR_REVIEWING;
      }
    }
    // 默认流程： 省区审批
    return OrderStatusEnum.PROVINCE_REVIEWING;
  }

  /**
   * 计算订单金额及相关校验结果
   *
   * 该方法用于根据客户信息以及三类商品（成品、补货、辅销）来计算订单总金额、补贴金额，
   * 并进一步计算补货与辅销商品的金额及其占补贴金额的比例。最后执行一系列校验策略，
   * 汇总校验消息并返回完整的响应对象。
   *
   * @param customerInfo 客户信息实体，包含客户名称和ID等基本信息
   * @param finishGoods 成品商品列表，参与订单金额的主要计算
   * @param replenishGoods 补货商品列表，用于计算补货金额及比例
   * @param auxiliaryGoods 辅销商品列表，用于计算辅销金额及比例
   * @returns 返回封装了各项金额、比例以及校验消息的 CheckOrderAmountResponse 对象
   */
  async calculateCheckAmountResult(
    customerInfo: CustomerInfoEntity,
    finishGoods: OrderItem[],
    replenishGoods: OrderItem[],
    auxiliaryGoods: OrderItem[],
  ) {
    const response = new CheckOrderAmountResponse();
    response.customerName = customerInfo.customerName;
    response.customerId = customerInfo.id;
    // 计算订单金额 = 商品数量 * 出厂价相加
    const orderAmount = await this.calculateAmountWithQuery(finishGoods);
    // 订单金额
    response.orderAmount = String(orderAmount);

    // 额度计算订单总额
    const subsidyAmount = await this.calculateAmountWithQuery(
      finishGoods,
      true,
    );
    response.orderSubsidyAmount = String(subsidyAmount);

    // 计算使用货补金额及比例
    if (replenishGoods != null && replenishGoods.length > 0) {
      const replenishAmount = await this.calculateAmountWithQuery(
        replenishGoods,
      );
      response.replenishAmount = String(replenishAmount);
      response.replenishRatio =
        subsidyAmount && subsidyAmount !== 0
          ? (replenishAmount / subsidyAmount).toFixed(4)
          : '0';
    }
    // 3. 计算辅销商品金额及比例；
    if (auxiliaryGoods != null && auxiliaryGoods.length > 0) {
      const auxiliaryAmount = await this.calculateAmountWithQuery(
        auxiliaryGoods,
      );
      response.auxiliarySalesAmount = String(auxiliaryAmount);
      response.auxiliarySalesRatio =
        subsidyAmount && subsidyAmount !== 0
          ? (auxiliaryAmount / subsidyAmount).toFixed(4)
          : '0';
    }
    // 执行所有校验策略
    const messages: string[] = [];
    // 执行所有校验策略
    const validationStrategies: ValidationStrategy[] = [
      new ReplenishRatioValidationStrategy(),
      new AuxiliarySalesRatioValidationStrategy(),
      new RegionQuotaValidationStrategy(this.creditAmountInfoRepository),
    ];
    for (const strategy of validationStrategies) {
      const strategyMessages = await strategy.validate(response, customerInfo);
      messages.push(...strategyMessages);
    }
    if (messages.length > 0) {
      response.isNeedApproval = true;
      response.message = messages.join('，') + '即将进入审批流程';
    }
    return response;
  }

  /**
   * 根据用户权限和订单状态获取可操作的订单按钮列表
   * @param user - 当前登录用户信息，包含 userId 和 nickName 等字段
   * @param token - 用户身份凭证，用于调用其他服务接口鉴权
   * @param orderId - 订单ID，用于查询对应的订单主信息
   * @returns 返回一个订单操作按钮数组，每个按钮包含编码、名称及是否可操作的状态
   */
  async getOrderOperateButtons(
    user: JwtUserPayload,
    token: string,
    orderId: string,
  ): Promise<OrderOperateButton[]> {
    const orderMain = await this.orderRepository.findOne({
      where: { id: orderId, deleted: GlobalStatusEnum.NO },
    });
    // 获取用户角色信息，属于对应角色组的人才允许操作
    const userResult = await this.userService.getRangeOfOrderQueryUser(
      token,
      user.userId,
    );

    const buttons: OrderOperateButton[] = [
      { buttonCode: 'MODIFY', buttonName: '修改订单', isOperate: false },
      { buttonCode: 'CONFIRM_PUSH', buttonName: '确认推单', isOperate: false },
      {
        buttonCode: 'CONFIRM_PAYMENT',
        buttonName: '确认回款',
        isOperate: false,
      },
      { buttonCode: 'CANCEL', buttonName: '取消订单', isOperate: false },
    ];
    // 修改为：
    const hasPermission =
      userResult.isQueryAll ||
      userResult.principalUserIds?.includes(orderMain.creatorId) ||
      user.userId === orderMain.creatorId;

    console.log('hasPermission:', hasPermission, user.userId, user.nickName);
    console.log('orderMain.orderStatus:', orderMain.orderStatus);
    // 将字符串状态转换为枚举值进行判断
    // const status = OrderStatusEnum[orderMain.orderStatus];
    // console.log('status:',status);
    // 根据不同订单状态设置可操作按钮
    switch (orderMain.orderStatus) {
      case OrderStatusEnum.PENDING_PAYMENT:
        if (hasPermission) {
          // 订单状态为 PENDING_PAYMENT 仅允许操作 确认回款
          buttons.find(
            (btn) => btn.buttonCode === 'CONFIRM_PAYMENT',
          ).isOperate = true;
        }
        break;

      case OrderStatusEnum.PENDING_PUSH:
        // 订单状态为 PENDING_PUSH 仅允许操作 确认推单
        if (hasPermission) {
          buttons.find((btn) => btn.buttonCode === 'CONFIRM_PUSH').isOperate =
            true;
        }
        break;

      case OrderStatusEnum.CLOSED:
      case OrderStatusEnum.PUSHING:
      case OrderStatusEnum.PUSHED:
      case OrderStatusEnum.DELIVERED:
        // 订单状态为 CLOSED、PUSHING、PUSHED、DELIVERED 不允许操作
        // 所有按钮保持 false
        break;
      case OrderStatusEnum.REJECTED:
        // 订单状态为 REJECTED 允许修改订单
        if (hasPermission) {
          buttons.find((btn) => btn.buttonCode === 'MODIFY').isOperate = true;
        }
        break;

      case OrderStatusEnum.DIRECTOR_REVIEWING:
      case OrderStatusEnum.REGION_REVIEWING:
      case OrderStatusEnum.PROVINCE_REVIEWING:
        // 订单状态为 DIRECTOR_REVIEWING、REGION_REVIEWING、PROVINCE_REVIEWING 允许修改订单
        // todo 1. 确认当前用户是否是客户的负责人，若为负责人，
        //  需要判断是否有审批记录，若存在审批通过记录，则不允许修改，若需要修改则需要审批驳回后回到驳回状态才允许修改
        if (hasPermission) {
          buttons.find((btn) => btn.buttonCode === 'MODIFY').isOperate = true;
        }
        break;

      default:
        // 其他状态下所有按钮默认不可操作
        break;
    }

    return buttons;
  }

  async checkIsCloseOrder(orderMain: OrderMainEntity): Promise<boolean> {
    // 校验是否被驳回，驳回后才可以关闭订单
    if (orderMain.orderStatus.includes('20001')) {
      // todo 校验是否有审批，有上级审批同意的情况需要驳回后再关闭订单,现在默认允许
      return true;
    }
    // 校验是否有审批，有上级审批同意的情况需要驳回后再关闭订单
    return OrderStatusEnum.REJECTED == orderMain.orderStatus;
  }

  /**
   * 查询商品并计算总金额
   * @param goods 商品列表
   * @param onlySubsidyInvolved
   * @returns 计算后的总金额
   */
  private async calculateAmountWithQuery(
    goods: OrderItem[],
    onlySubsidyInvolved = false,
  ): Promise<number> {
    const commodityIds = goods.map((item) => item.commodityId);
    const commodityInfos =
      await this.commodityService.getCommodityListByCommodityIds(commodityIds);
    return OrderConvertHelper.calculateTotalAmount(
      goods,
      commodityInfos,
      onlySubsidyInvolved,
    );
  }
}
