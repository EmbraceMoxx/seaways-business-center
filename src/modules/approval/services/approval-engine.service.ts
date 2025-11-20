import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager, In } from 'typeorm';
import { ApprovalInstanceEntity } from '../entities/approval-instance.entity';
import { ApprovalProcessDefinitionEntity } from '../entities/approval-process-definition.entity';
import { ApprovalProcessNodeEntity } from '../entities/approval-process-node.entity';
import { ApprovalTaskEntity } from '../entities/approval-task.entity';
import { RuleEngineService } from './rule-engine.service';
import { ApprovalContext } from '../interfaces/approval-context.interface';
import {
  ApprovalTaskStatusEnum,
  ApprovalInstanceStatusEnum,
  ApprovalActionEnum,
  AssigneeType,
  CustomerResponsibleType,
} from '@src/enums/approval.enum';
import { BusinessException } from '@src/dto/common/common.dto';
import { generateId } from '@src/utils';
import * as _ from 'lodash';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
import { isResubmitAllowed, getResubmitMessage } from './order-status.config';

@Injectable()
export class ApprovalEngineService implements OnModuleInit {
  private readonly logger = new Logger(ApprovalEngineService.name);

  // Todo: 各个环节加上异常处理
  constructor(
    @InjectRepository(ApprovalInstanceEntity)
    private instanceRepository: Repository<ApprovalInstanceEntity>,
    @InjectRepository(ApprovalProcessDefinitionEntity)
    private processRepository: Repository<ApprovalProcessDefinitionEntity>,
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
    private ruleEngineService: RuleEngineService,
    private entityManager: EntityManager,
  ) {}
  async onModuleInit() {
    // this.startApprovalProcess({
    //   order: {
    //     id: '645870245705289728',
    //     creatorId: '633192657597894656',
    //     customerId: '1146656387023851520',
    //     regionalHeadId: '633192657597894656',
    //     provincialHeadId: '',
    //     usedReplenishRatio: 0.06,
    //     usedAuxiliarySalesRatio: 0.02,
    //   },
    //   operator: {
    //     id: '1',
    //     name: 'admin',
    //   },
    // });
  }

  /**
   * 启动审批流程
   */
  async startApprovalProcess(
    context: ApprovalContext,
  ): Promise<ApprovalInstanceEntity> {
    const { operator, order } = context;

    // 检查是否已存在审批实例
    const existingInstance = await this.instanceRepository.findOneBy({
      orderId: order.id,
    });

    if (existingInstance) {
      // 检查是否可以重新提交
      await this.validateResubmission(existingInstance, operator);
    }

    // 创建新的审批流程
    return await this.createNewApprovalProcess(context, existingInstance);
  }

  /**
   * 验证是否可以重新提交
   */
  private async validateResubmission(
    instance: ApprovalInstanceEntity,
    operator: any,
  ): Promise<void> {
    // 检查订单状态
    const currentOrder = await this.entityManager.findOneBy(OrderMainEntity, {
      id: instance.orderId,
    });
    if (!currentOrder) throw new BusinessException('未找到关联的订单');

    if (!isResubmitAllowed(currentOrder.orderStatus)) {
      const errorMessage = getResubmitMessage(currentOrder.orderStatus);
      throw new BusinessException(errorMessage);
    }

    // 检查任务审批状态
    const task = await this.taskRepository.findOneBy({
      instanceId: instance.id,
      status: ApprovalTaskStatusEnum.APPROVED,
      autoApproved: GlobalStatusEnum.NO, // 非自动审批
    });
    if (task) {
      throw new BusinessException('流程已被审批过，无法重新提交');
    }

    this.logger.log(
      `允许重新提交: 实例 ${instance.id}, 操作人 ${operator.name}`,
    );
  }

  /**
   * 启动审批流程
   */
  async createNewApprovalProcess(
    context: ApprovalContext,
    existingInstance: ApprovalInstanceEntity,
  ): Promise<ApprovalInstanceEntity> {
    const { operator, order } = context;

    // 获取流程定义
    const process = await this.processRepository.findOneBy({
      processCode: 'OFFLINE_ORDER',
    });
    if (!process) throw new BusinessException('未找到适用的审批流程定义');

    // 计算审批路径
    const nodePath = await this.ruleEngineService.calculateApprovalPath(
      process.id,
      context,
    );
    if (!nodePath?.length) throw new Error('无法计算审批路径');

    const instanceId = generateId();

    // 批量创建审批任务
    const taskPromises = nodePath.map((node, index) =>
      this.createTask(instanceId, node, context, index + 1),
    );
    const tasks: ApprovalTaskEntity[] = await Promise.all(taskPromises);

    // 查找第一个待处理任务
    const currentTask = _.minBy(
      tasks.filter((x) => x.status === ApprovalTaskStatusEnum.PENDING),
      'taskStep',
    );

    return await this.entityManager.transaction(async (manager) => {
      if (existingInstance) {
        await Promise.all([
          manager.delete(ApprovalTaskEntity, {
            instanceId: existingInstance.id,
          }),
          manager.delete(ApprovalInstanceEntity, existingInstance.id),
        ]);
        this.logger.log(`删除现有审批流程: 实例 ${existingInstance.id}`);
      }
      const instance = await manager.save(ApprovalInstanceEntity, {
        id: instanceId,
        processId: process.id,
        orderId: order.id,
        ...(currentTask && {
          currentNodeId: currentTask.nodeId,
          currentStep: currentTask.taskStep,
        }),
        status: currentTask
          ? ApprovalInstanceStatusEnum.IN_PROGRESS
          : ApprovalInstanceStatusEnum.APPROVED,
        creatorId: operator.id,
        creatorName: operator.name,
        reviserId: operator.id,
        reviserName: operator.name,
      });
      await manager.save(ApprovalTaskEntity, tasks);
      this.logger.log(
        `审批启动成功: 实例 ${instance.id}, 任务数 ${tasks.length}`,
      );
      return instance;
    });
  }

  /**
   * 处理审批任务
   */
  // Todo: 加一个订单取消，也要更新审批实例（还是直接在订单取消的地方处理？）
  async processTaskApproval(context: ApprovalContext): Promise<string> {
    const { operator, order } = context;
    const { action, remark } = operator;

    const instance = await this.instanceRepository.findOneBy({
      orderId: order.id,
    });
    if (!instance) throw new BusinessException('审批实例不存在');

    // 获取当前待处理任务
    const task = await this.taskRepository.findOneBy({
      instanceId: instance.id,
      nodeId: instance.currentNodeId,
      status: ApprovalTaskStatusEnum.PENDING,
    });
    if (!task) throw new BusinessException('当前无待审批任务');

    // 检查当前操作人是否是任务的审批人
    if (task.approverUserId !== operator.id) {
      throw new BusinessException(
        `当前操作人 ${operator.name} 不是此任务的指定审批人`,
      );
    }

    switch (action) {
      case ApprovalActionEnum.AGREE:
        return await this.handleTaskApproval(instance, task, operator, remark);
      case ApprovalActionEnum.REFUSE:
        return await this.handleTaskRejection(instance, task, operator, remark);
      default:
        throw new BusinessException(`不支持的审批操作: ${action}`);
    }
  }

  /**
   * 处理审批通过
   */
  private async handleTaskApproval(
    instance: ApprovalInstanceEntity,
    task: ApprovalTaskEntity,
    operator: any,
    remark: string,
  ): Promise<string> {
    // 更新任务状态
    task.status = ApprovalTaskStatusEnum.APPROVED;
    task.remark = remark;
    task.reviserId = operator.id;
    task.reviserName = operator.name;

    // 查找下一个任务
    const nextTask = await this.taskRepository.findOne({
      where: {
        instanceId: task.instanceId,
        taskStep: MoreThan(task.taskStep),
        status: ApprovalTaskStatusEnum.PENDING,
      },
      order: { taskStep: 'ASC' },
    });

    if (nextTask) {
      // 推进到下一个任务
      instance.currentNodeId = nextTask.nodeId;
      instance.currentStep = nextTask.taskStep;
      instance.reviserId = operator.id;
      instance.reviserName = operator.name;
      // Todo: 通知
      this.logger.log(
        `推进到下一步: 任务 ${nextTask.id}, 审批人 ${nextTask.approverUserId}`,
      );
    } else {
      // 流程完成
      instance.status = ApprovalInstanceStatusEnum.APPROVED;
      instance.reviserId = operator.id;
      instance.reviserName = operator.name;
      this.logger.log(`审批流程完成: 实例 ${instance.id}`);
    }
    await this.entityManager.transaction(async (manager) => {
      await Promise.all([manager.save(task), manager.save(instance)]);
    });

    return ApprovalTaskStatusEnum.APPROVED;
  }

  /**
   * 处理审批驳回
   */
  private async handleTaskRejection(
    instance: ApprovalInstanceEntity,
    task: ApprovalTaskEntity,
    operator: any,
    remark: string,
  ): Promise<string> {
    // 更新任务状态
    // Todo: 如果是ROLE，要更新多个task
    task.status = ApprovalTaskStatusEnum.REJECTED;
    task.remark = remark;
    task.reviserId = operator.id;
    task.reviserName = operator.name;
    // 审批驳回，终止流程
    instance.status = ApprovalInstanceStatusEnum.REJECTED;
    instance.reviserId = operator.id;
    instance.reviserName = operator.name;
    await this.entityManager.transaction(async (manager) => {
      await Promise.all([manager.save(task), manager.save(instance)]);
    });
    return ApprovalInstanceStatusEnum.REJECTED;
  }

  /**
   * 创建审批任务
   */
  private async createTask(
    instanceId: string,
    node: ApprovalProcessNodeEntity,
    context: ApprovalContext,
    taskStep: number,
  ): Promise<ApprovalTaskEntity> {
    const { operator } = context;

    // 计算审批人和状态
    const { approverUserId, status, autoApproved, remark } =
      await this.calculateTaskDetails(node, context);

    // Todo: 如果按ROLE或USER，要生成多个task
    const task = this.taskRepository.create({
      instanceId,
      nodeId: node.id,
      taskStep,
      approverUserId,
      status,
      autoApproved,
      remark,
      creatorId: operator.id,
      creatorName: operator.name,
      reviserId: operator.id,
      reviserName: operator.name,
    });

    return task;
  }

  /**
   * 计算任务详情（审批人、状态、备注）
   */
  private async calculateTaskDetails(
    node: ApprovalProcessNodeEntity,
    context: ApprovalContext,
  ): Promise<{
    approverUserId: string | null;
    status: string;
    autoApproved: string;
    remark: string;
  }> {
    switch (node.assigneeType) {
      case AssigneeType.CUSTOMER_RESPONSIBLE:
        return this.handleCustomerResponsible(node, context);

      case AssigneeType.USER:
        return this.handleUserAssignment(node, context);

      default:
        throw new BusinessException(`不支持的审批人类型: ${node.assigneeType}`);
    }
  }

  /**
   * 处理客户负责人审批
   */
  private handleCustomerResponsible(
    node: ApprovalProcessNodeEntity,
    context: ApprovalContext,
  ): {
    approverUserId: string | null;
    status: string;
    autoApproved: string;
    remark: string;
  } {
    const { order } = context;

    // 省区审批
    if (node.assigneeValue === CustomerResponsibleType.PROVINCIAL_HEAD) {
      if (!order.provincialHeadId) {
        return {
          approverUserId: null,
          status: ApprovalTaskStatusEnum.SKIPPED,
          autoApproved: GlobalStatusEnum.YES,
          remark: '客户无省区负责人，跳过审批',
        };
      }

      const isSelfApproval = order.provincialHeadId === order.creatorId;
      return {
        approverUserId: order.provincialHeadId,
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
    if (node.assigneeValue === CustomerResponsibleType.REGIONAL_HEAD) {
      if (!order.regionalHeadId) {
        throw new BusinessException('客户必须有大区负责人');
      }
      const isSelfApproval = order.regionalHeadId === order.creatorId;
      return {
        approverUserId: order.regionalHeadId,
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
    context: ApprovalContext,
  ): {
    approverUserId: string | null;
    status: string;
    autoApproved: string;
    remark: string;
  } {
    const { order } = context;
    const isSelfApproval = node.assigneeValue === order.creatorId;
    return {
      approverUserId: node.assigneeValue,
      status: isSelfApproval
        ? ApprovalTaskStatusEnum.APPROVED
        : ApprovalTaskStatusEnum.PENDING,
      autoApproved: isSelfApproval ? GlobalStatusEnum.YES : GlobalStatusEnum.NO,
      remark: isSelfApproval ? '自动通过（自审批）' : '',
    };
  }
}
