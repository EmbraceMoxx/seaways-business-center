import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager } from 'typeorm';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
import * as dayjs from 'dayjs';
import { OrderLogHelper } from '@modules/order/helper/order.log.helper';
// Dto
import {
  ApprovalCommand,
  CreateApprovalDto,
} from '@src/dto/approval/approval.dto';
import { BusinessException } from '@src/dto/common/common.dto';
// Entity
import { ApprovalInstanceEntity } from '../entities/approval-instance.entity';
import { ApprovalProcessNodeEntity } from '../entities/approval-process-node.entity';
import { ApprovalTaskEntity } from '../entities/approval-task.entity';
import { OrderMainEntity } from '@src/modules/order/entities/order.main.entity';
// Enum
import {
  ApprovalTaskStatusEnum,
  AssigneeTypeEnum,
  CustomerResponsibleTypeEnum,
  ApprovalInstanceStatusEnum,
} from '@src/enums/approval.enum';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { OrderOperateTemplateEnum } from '@src/enums/order-operate-template.enum';
import { OrderStatusEnum } from '@src/enums/order-status.enum';
// Service
import { BusinessLogService } from '@modules/common/business-log/business-log.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
    @InjectRepository(ApprovalProcessNodeEntity)
    private nodeRepository: Repository<ApprovalProcessNodeEntity>,
    private entityManager: EntityManager,
    private businessLogService: BusinessLogService,
  ) {}

  /**
   * 创建审批任务
   */
  async createTask(
    instanceId: string,
    node: ApprovalProcessNodeEntity,
    createDto: CreateApprovalDto,
    taskStep: number,
  ): Promise<ApprovalTaskEntity> {
    // 计算审批人和状态
    const { approverUserId, status, autoApproved, remark } =
      await this.calculateTaskDetails(node, createDto);

    // Todo: 如果按ROLE或USER，要生成多个task
    const task = this.taskRepository.create({
      instanceId,
      nodeId: node.id,
      taskStep,
      approverUserId,
      status,
      autoApproved,
      remark,
      creatorId: createDto.operatorId,
      creatorName: createDto.operatorName,
      reviserId: createDto.operatorId,
      reviserName: createDto.operatorName,
    });

    return task;
  }

  /**
   * 计算任务详情（审批人、状态、备注）
   */
  private async calculateTaskDetails(
    node: ApprovalProcessNodeEntity,
    createDto: CreateApprovalDto,
  ): Promise<{
    approverUserId: string | null;
    status: string;
    autoApproved: string;
    remark: string;
  }> {
    switch (node.assigneeType) {
      case AssigneeTypeEnum.CUSTOMER_RESPONSIBLE:
        return this.handleCustomerResponsible(node, createDto);

      case AssigneeTypeEnum.USER:
        return this.handleUserAssignment(node, createDto);

      default:
        throw new BusinessException(`不支持的审批人类型: ${node.assigneeType}`);
    }
  }

  /**
   * 处理客户负责人审批
   */
  private handleCustomerResponsible(
    node: ApprovalProcessNodeEntity,
    createDto: CreateApprovalDto,
  ): {
    approverUserId: string | null;
    status: string;
    autoApproved: string;
    remark: string;
  } {
    // 省区审批
    if (node.assigneeValue === CustomerResponsibleTypeEnum.PROVINCIAL_HEAD) {
      if (!createDto.provincialHeadId) {
        return {
          approverUserId: null,
          status: ApprovalTaskStatusEnum.SKIPPED,
          autoApproved: GlobalStatusEnum.YES,
          remark: '客户无省区负责人，跳过审批',
        };
      }

      const isSelfApproval =
        String(createDto.provincialHeadId) === String(createDto.creatorId);
      return {
        approverUserId: createDto.provincialHeadId,
        status: isSelfApproval
          ? ApprovalTaskStatusEnum.APPROVED
          : ApprovalTaskStatusEnum.PENDING,
        autoApproved: isSelfApproval
          ? GlobalStatusEnum.YES
          : GlobalStatusEnum.NO,
        remark: isSelfApproval ? '自动通过（自审批）' : '',
      };
    }

    // 大区审批
    if (node.assigneeValue === CustomerResponsibleTypeEnum.REGIONAL_HEAD) {
      if (!createDto.regionalHeadId) {
        throw new BusinessException('客户必须有大区负责人');
      }
      const isSelfApproval =
        String(createDto.regionalHeadId) === String(createDto.creatorId);
      return {
        approverUserId: createDto.regionalHeadId,
        status: isSelfApproval
          ? ApprovalTaskStatusEnum.APPROVED
          : ApprovalTaskStatusEnum.PENDING,
        autoApproved: isSelfApproval
          ? GlobalStatusEnum.YES
          : GlobalStatusEnum.NO,
        remark: isSelfApproval ? '自动通过（自审批）' : '',
      };
    }

    throw new BusinessException(
      `不支持的客户负责人类型: ${node.assigneeValue}`,
    );
  }

  /**
   * 处理指定用户审批
   */
  private handleUserAssignment(
    node: ApprovalProcessNodeEntity,
    createDto: CreateApprovalDto,
  ): {
    approverUserId: string | null;
    status: string;
    autoApproved: string;
    remark: string;
  } {
    const isSelfApproval =
      String(node.assigneeValue) === String(createDto.creatorId);
    return {
      approverUserId: node.assigneeValue,
      status: isSelfApproval
        ? ApprovalTaskStatusEnum.APPROVED
        : ApprovalTaskStatusEnum.PENDING,
      autoApproved: isSelfApproval ? GlobalStatusEnum.YES : GlobalStatusEnum.NO,
      remark: isSelfApproval ? '自动通过（自审批）' : '',
    };
  }

  /**
   * 获取订单状态
   */
  // Todo：应该是先判断instance的状态，如果是处理中，再通过Task查是什么状态
  async getOrderStatus(task: ApprovalTaskEntity): Promise<OrderStatusEnum> {
    if (!task) return OrderStatusEnum.PENDING_PUSH;

    const nextNode = await this.nodeRepository.findOneBy({
      id: task.nodeId,
    });

    return nextNode.orderStatus as OrderStatusEnum;
  }

  /**
   * 处理审批通过
   */
  async handleTaskApproval(
    instance: ApprovalInstanceEntity,
    assignedTask: ApprovalTaskEntity,
    nodeTasks: ApprovalTaskEntity[],
    command: ApprovalCommand,
    user: JwtUserPayload,
  ): Promise<{ status: string; message: string }> {
    const orderMain = await this.entityManager.findOne(OrderMainEntity, {
      where: { id: instance.orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) throw new BusinessException('订单不存在或已被删除');

    // 获取日志操作类型
    const operate = this.getOperateType(orderMain.orderStatus);

    assignedTask.status = ApprovalTaskStatusEnum.APPROVED;
    assignedTask.remark = command.remark;
    assignedTask.reviserId = user.userId;
    assignedTask.reviserName = user.nickName;

    const otherTasks = nodeTasks.filter(
      (t) =>
        t.approverUserId !== user.userId &&
        t.status === ApprovalTaskStatusEnum.PENDING,
    );
    otherTasks.forEach((otherTask) => {
      otherTask.status = ApprovalTaskStatusEnum.SKIPPED;
      otherTask.remark = otherTask.remark || '同级审批人已处理，该任务被跳过';
      otherTask.reviserId = user.userId;
      otherTask.reviserName = user.nickName;
    });

    // 查找下一个任务
    // Todo: 其实这里是查下一个节点，如果是任务的话，可能有多个
    const nextTask = await this.taskRepository.findOne({
      where: {
        instanceId: assignedTask.instanceId,
        taskStep: MoreThan(assignedTask.taskStep),
        status: ApprovalTaskStatusEnum.PENDING,
      },
      order: { taskStep: 'ASC' },
    });

    // 获取下一个状态
    const nextStatus: OrderStatusEnum = await this.getOrderStatus(nextTask);
    if (!nextStatus) throw new BusinessException('获取下一个状态失败');

    if (nextTask) {
      // 推进到下一个节点
      instance.status = ApprovalInstanceStatusEnum.IN_PROGRESS;
      instance.currentNodeId = nextTask.nodeId;
      instance.currentStep = nextTask.taskStep;
      instance.reviserId = user.userId;
      instance.reviserName = user.nickName;
      // Todo: 操作日志
      this.logger.log(
        `推进到下一步: 任务 ${nextTask.id}, 审批人 ${nextTask.approverUserId}`,
      );
    } else {
      // 流程完成
      instance.status = ApprovalInstanceStatusEnum.APPROVED;
      instance.reviserId = user.userId;
      instance.reviserName = user.nickName;
      this.logger.log(`审批流程完成: 实例 ${instance.id}`);
    }

    const updateOrder = Object.assign(new OrderMainEntity(), {
      id: instance.orderId,
      approvalRemark: command.remark,
      orderStatus: String(nextStatus),
      auditTime: dayjs().toDate(),
      reviserId: user.userId,
      reviserName: user.nickName,
      revisedTime: dayjs().toDate(),
    });

    const lastOperateProgram = 'TaskService.handleTaskApproval';
    // Todo: 写入日志重写一份到审批模块
    const result = OrderLogHelper.getOrderOperate(
      user,
      operate,
      lastOperateProgram,
      instance.orderId,
    );

    if (command.remark) {
      result.action = `${result.action};同意原因为:${command.remark}`;
    }

    const tasksToSave = [assignedTask, ...otherTasks];

    // 事务保存
    await this.entityManager.transaction(async (manager) => {
      await Promise.all([
        // 更新审批步骤
        manager.save(tasksToSave),
        // 更新实例
        manager.save(instance),
        // 更新订单
        manager.update(OrderMainEntity, { id: instance.orderId }, updateOrder),
        // 写入日志
        this.businessLogService.writeLog(result, manager),
      ]);
    });

    return {
      status: ApprovalTaskStatusEnum.APPROVED,
      message: nextTask ? '审批通过，流程继续' : '审批完成',
    };
  }

  /**
   * 获取操作类型
   */
  private getOperateType(orderStatus: string): OrderOperateTemplateEnum {
    const operateMap = {
      [OrderStatusEnum.PROVINCE_REVIEWING]:
        OrderOperateTemplateEnum.PROVINCE_APPROVAL_ORDER,
      [OrderStatusEnum.REGION_REVIEWING]:
        OrderOperateTemplateEnum.REGION_APPROVAL_ORDER,
      [OrderStatusEnum.DIRECTOR_REVIEWING]:
        OrderOperateTemplateEnum.DIRECTOR_APPROVAL_ORDER,
    };

    const operate = operateMap[orderStatus];
    if (!operate) throw new BusinessException('找不到对应的审批节点');

    return operate;
  }

  /**
   * 处理审批驳回
   */
  async handleTaskRejection(
    instance: ApprovalInstanceEntity,
    assignedTask: ApprovalTaskEntity,
    nodeTasks: ApprovalTaskEntity[],
    command: ApprovalCommand,
    user: JwtUserPayload,
  ): Promise<{ status: string; message: string }> {
    const { remark } = command;

    if (instance.status === ApprovalInstanceStatusEnum.REJECTED) {
      throw new BusinessException('订单已处于驳回状态无需再次操作！');
    }

    const orderMain = await this.entityManager.findOne(OrderMainEntity, {
      where: { id: instance.orderId, deleted: GlobalStatusEnum.NO },
    });
    if (!orderMain) throw new BusinessException('订单不存在或已被删除');

    if (OrderStatusEnum.REJECTED === orderMain.orderStatus) {
      throw new BusinessException('订单已处于驳回状态无需再次操作！');
    }

    // 更新实例状态：审批驳回，终止流程
    instance.status = ApprovalInstanceStatusEnum.REJECTED;
    instance.reviserId = user.userId;
    instance.reviserName = user.nickName;

    assignedTask.status = ApprovalTaskStatusEnum.REJECTED;
    assignedTask.remark = command.remark;
    assignedTask.reviserId = user.userId;
    assignedTask.reviserName = user.nickName;

    const otherTasks = nodeTasks.filter(
      (t) =>
        t.approverUserId !== user.userId &&
        t.status === ApprovalTaskStatusEnum.PENDING,
    );
    otherTasks.forEach((otherTask) => {
      otherTask.status = ApprovalTaskStatusEnum.SKIPPED;
      otherTask.remark = otherTask.remark || '同级审批人已驳回，该任务被跳过';
      otherTask.reviserId = user.userId;
      otherTask.reviserName = user.nickName;
    });

    const lastOperateProgram = 'TaskService.handleTaskRejection';

    const updateOrder = Object.assign(new OrderMainEntity(), {
      id: instance.orderId,
      approvalRemark: remark,
      orderStatus: String(OrderStatusEnum.REJECTED),
      auditTime: dayjs().toDate(),
      reviserId: user.userId,
      reviserName: user.nickName,
      revisedTime: dayjs().toDate(),
    });

    const result = OrderLogHelper.getOrderOperate(
      user,
      OrderOperateTemplateEnum.REJECT_ORDER,
      lastOperateProgram,
      instance.orderId,
    );
    if (command.remark) {
      result.action = result.action + ';驳回原因为:' + command.remark;
    }

    const tasksToSave = [assignedTask, ...otherTasks];

    // 事务处理
    await this.entityManager.transaction(async (manager) => {
      await Promise.all([
        manager.save(tasksToSave),
        manager.save(instance),
        manager.update(OrderMainEntity, { id: orderMain.id }, updateOrder),
        this.businessLogService.writeLog(result, manager),
      ]);
    });

    return {
      status: ApprovalInstanceStatusEnum.REJECTED,
      message: '审批已驳回，流程终止',
    };
  }
}
