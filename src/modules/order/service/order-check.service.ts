import { Injectable, Logger } from '@nestjs/common';
import {
  BusinessException,
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
  UsePreRioValidationStrategy,
  ValidationStrategy,
} from '@modules/order/strategy/order-validation.interface';
import { ApprovalEngineService } from '@modules/approval/services/approval-engine.service';
import { plainToInstance } from 'class-transformer';
import { MoneyUtil } from '@utils/MoneyUtil';
import { ApprovalConfig } from '@src/configs/approval.config';

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
    private approvalConfig: ApprovalConfig,
    private approvalEngineService: ApprovalEngineService,
    private readonly replenishStrategy: ReplenishRatioValidationStrategy,
    private readonly auxiliaryStrategy: AuxiliarySalesRatioValidationStrategy,
    private readonly usePreRioValidationStrategy: UsePreRioValidationStrategy,
  ) {}
  /**
   * 检查订单是否存在
   * @param orderId 订单ID
   * @returns Promise<Order> 订单主信息对象
   * @throws BusinessException 当订单不存在或已被删除时抛出异常
   */
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
   * 根据订单编码检查订单是否存在
   * @param orderCode 订单编码
   * @returns Promise<OrderMain> 订单主信息对象
   * @throws BusinessException 当订单不存在或已被删除时抛出异常
   */
  async checkOrderExistByOrderCode(orderCode: string) {
    const orderMain = await this.orderRepository.findOne({
      where: { orderCode: orderCode, deleted: GlobalStatusEnum.NO },
    });
    this.logger.log(`orderMain:${JSON.stringify(orderMain)}`);
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
    // 1. 计算比例
    const auxRatio = Number(response.auxiliarySalesRatio) || 0;
    const repRatio = Number(response.replenishRatio) || 0;
    const subsidyAmount = Number(response.orderSubsidyAmount) || 0;

    // 2. 是否免审批
    if (this.isFreeApproval(customerInfo, auxRatio, repRatio, subsidyAmount)) {
      this.logger.log(`免审批：auxRatio=${auxRatio}, repRatio=${repRatio}`);
      return OrderStatusEnum.PENDING_PAYMENT;
    }
    // 3. 需要审批：按人岗关系决定第一站
    const isCreator = user.userId === customerInfo.principalUserId;
    this.logger.log(
      `需审批：auxRatio=${auxRatio}, repRatio=${repRatio}, ` +
        `isCreator=${isCreator}, provincialHeadId=${customerInfo.provincialHeadId}, ` +
        `regionalHeadId=${customerInfo.regionalHeadId}`,
    );
    // 3.1 省区存在
    if (customerInfo.provincialHeadId) {
      return isCreator
        ? OrderStatusEnum.REGION_REVIEWING //  其他人提交→先到大区
        : OrderStatusEnum.PROVINCE_REVIEWING; //  creator 自己就是省区
    }

    // 3.2 仅大区存在
    if (customerInfo.regionalHeadId) {
      return isCreator
        ? OrderStatusEnum.DIRECTOR_REVIEWING
        : OrderStatusEnum.REGION_REVIEWING;
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
   * @param customer
   * @param finishGoods 成品商品列表，参与订单金额的主要计算
   * @param replenishGoods 补货商品列表，用于计算补货金额及比例
   * @param auxiliaryGoods 辅销商品列表，用于计算辅销金额及比例
   * @returns 返回封装了各项金额、比例以及校验消息的 CheckOrderAmountResponse 对象
   */
  async calculateCheckAmountResult(
    customer: CustomerInfoEntity,
    finishGoods: OrderItem[],
    replenishGoods: OrderItem[],
    auxiliaryGoods: OrderItem[],
  ) {
    // 计算订单金额 = 商品数量 * 出厂价相加
    // 统一做空值保护
    finishGoods = finishGoods ?? [];
    replenishGoods = replenishGoods ?? [];
    auxiliaryGoods = auxiliaryGoods ?? [];
    /* ---------- 1. 金额计算 ---------- */
    const [orderAmount, subsidyAmount] = await Promise.all([
      this.calculateAmountWithQuery(finishGoods, false),
      this.calculateAmountWithQuery(finishGoods, true),
    ]);
    const replenishAmount = await this.calculateAmountWithQuery(
      replenishGoods,
      false,
    );
    const auxiliaryAmount = await this.calculateAmountWithQuery(
      auxiliaryGoods,
      false,
    );

    /* ---------- 2. 比例 & 审批标志 ---------- */
    const replenishRatio = MoneyUtil.safeDivide(replenishAmount, subsidyAmount);
    const auxiliarySalesRatio = MoneyUtil.safeDivide(
      auxiliaryAmount,
      subsidyAmount,
    );
    const needApproval = this.needApproval(
      customer,
      replenishRatio,
      auxiliarySalesRatio,
      subsidyAmount,
      replenishAmount,
      auxiliaryAmount,
    );
    /* ---------- 3. 校验策略插件 ---------- */
    const strategies: ValidationStrategy[] = [
      this.replenishStrategy,
      this.auxiliaryStrategy,
      this.usePreRioValidationStrategy,
      // new RegionQuotaValidationStrategy(this.creditAmountInfoRepository),
    ];
    this.logger.log(`repRatio:${replenishRatio}`);
    this.logger.log(`auxiliarySalesRatio:${auxiliarySalesRatio}`);
    this.logger.log(`needApproval:${needApproval}`);
    const messages = (
      await Promise.all(
        strategies.map((s) =>
          s.validate(
            {
              replenishRatio,
              auxiliarySalesRatio,
              needApproval,
              orderSubsidyAmount: subsidyAmount,
              replenishAmount,
              auxiliaryAmount,
            } as any,
            customer,
          ),
        ),
      )
    ).flat();
    const message = messages.length
      ? `${messages.join('，')}，即将进入审批流程`
      : '';
    return plainToInstance(CheckOrderAmountResponse, {
      customerName: customer.customerName,
      customerId: customer.id,
      orderAmount: orderAmount.toFixed(2),
      orderSubsidyAmount: subsidyAmount.toFixed(2),
      replenishAmount: replenishAmount.toFixed(2),
      replenishRatio: replenishRatio.toFixed(4),
      auxiliarySalesAmount: auxiliaryAmount.toFixed(2),
      auxiliarySalesRatio: auxiliarySalesRatio.toFixed(4),
      isNeedApproval: needApproval || messages.length > 0,
      message,
    });
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

    // 获取审批明细
    const approvalResult = await this.approvalEngineService.getApprovalStatus(
      orderId,
    );
    this.logger.log(
      `根据订单号${orderId},得到的审批结果为：${JSON.stringify(
        approvalResult,
      )}`,
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

    // 根据不同订单状态设置可操作按钮
    switch (orderMain.orderStatus) {
      case OrderStatusEnum.PENDING_PAYMENT:
        if (hasPermission) {
          // 订单状态为 PENDING_PAYMENT 仅允许操作 确认回款
          buttons.find(
            (btn) => btn.buttonCode === 'CONFIRM_PAYMENT',
          ).isOperate = true;
          if (approvalResult.canCancel) {
            buttons.find((btn) => btn.buttonCode === 'MODIFY').isOperate = true;
          }
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
        // 所有按钮保持 false
        break;
      case OrderStatusEnum.REJECTED:
        // 订单状态为 REJECTED 允许修改订单
        if (hasPermission) {
          buttons.find((btn) => btn.buttonCode === 'MODIFY').isOperate = true;
          buttons.find((btn) => btn.buttonCode === 'CANCEL').isOperate = true;
        }
        break;

      case OrderStatusEnum.DIRECTOR_REVIEWING:
      case OrderStatusEnum.REGION_REVIEWING:
      case OrderStatusEnum.PROVINCE_REVIEWING:
        // 1. 确认当前用户是否是客户的负责人，若为负责人，
        //  需要判断是否有审批记录，若存在审批通过记录，则不允许修改，若需要修改则需要审批驳回后回到驳回状态才允许修改
        if (hasPermission && approvalResult.canCancel) {
          buttons.find((btn) => btn.buttonCode === 'MODIFY').isOperate = true;
          buttons.find((btn) => btn.buttonCode === 'CANCEL').isOperate = true;
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
      // 校验是否有审批，有上级审批同意的情况需要驳回后再关闭订单,审批结果返回true表示允许取消
      const approvalResult = await this.approvalEngineService.getApprovalStatus(
        orderMain.id,
      );
      this.logger.log(
        `根据订单号${orderMain.id},得到的审批结果为：${JSON.stringify(
          approvalResult,
        )}`,
      );
      return approvalResult.canCancel;
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
    if (!goods || goods.length === 0) return 0;
    const commodityIds = goods.map((item) => item.commodityId);
    const commodityInfos =
      await this.commodityService.getCommodityListByCommodityIds(commodityIds);
    return OrderConvertHelper.calculateTotalAmount(
      goods,
      commodityInfos,
      onlySubsidyInvolved,
    );
  }

  /** 唯一一份比例规则 */
  private getApprovalThresholds(customer: CustomerInfoEntity) {
    return {
      aux: this.approvalConfig.auxiliaryFreeRatio,
      rep: customer.provincialHeadId
        ? this.approvalConfig.provinceReplenishmentFreeRatio
        : this.approvalConfig.maxReplenishmentFreeApprovalRatio,
    };
  }

  /** 免审批 = 两个比例都不超阈值 */
  private isFreeApproval(
    c: CustomerInfoEntity,
    aux: number,
    rep: number,
    subsidyAmount: number,
  ): boolean {
    const t = this.getApprovalThresholds(c);
    const compareResult = aux <= t.aux && rep <= t.rep;
    if (compareResult) {
      // 若阈值比例免审批，则额度金额是否为0
      return subsidyAmount > 0;
    }
    return compareResult;
  }

  /** 需审批 = 任一比例超过阈值 */
  private needApproval(
    c: CustomerInfoEntity,
    aux: number,
    rep: number,
    subsidyAmount: number,
    replenishAmount: number,
    auxiliaryAmount: number,
  ): boolean {
    const t = this.getApprovalThresholds(c);
    const compareResult = aux > t.aux || rep > t.rep;
    // 当符合比例，再进入最后的金额校验
    if (!compareResult) {
      if ((subsidyAmount <= 0 && replenishAmount > 0) || auxiliaryAmount > 0) {
        return true;
      }
    }
    return compareResult;
  }
}
