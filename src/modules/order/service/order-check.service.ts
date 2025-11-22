import { Injectable } from '@nestjs/common';
import { OrderOperateButton } from '@src/dto';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
import { UserService } from '@modules/common/user/user.service';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OrderCheckService {
  constructor(
    private userService: UserService,
    @InjectRepository(OrderMainEntity)
    private orderRepository: Repository<OrderMainEntity>,
  ) {}

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
}
