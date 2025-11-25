import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager } from 'typeorm';
import { ApprovalTaskEntity } from '../entities/approval-task.entity';
import { ApprovalProcessNodeEntity } from '../entities/approval-process-node.entity';
import { ApprovalInstanceEntity } from '../entities/approval-instance.entity';
import {
  ApprovalCommand,
  CreateApprovalDto,
} from '@src/dto/approval/approval.dto';
import { BusinessException } from '@src/dto/common/common.dto';
import {
  ApprovalTaskStatusEnum,
  AssigneeTypeEnum,
  CustomerResponsibleTypeEnum,
  ApprovalInstanceStatusEnum,
} from '@src/enums/approval.enum';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
    private entityManager: EntityManager,
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

      const isSelfApproval = createDto.provincialHeadId === createDto.creatorId;
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
      const isSelfApproval = createDto.regionalHeadId === createDto.creatorId;
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
    const isSelfApproval = node.assigneeValue === createDto.creatorId;
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
   * 处理审批通过
   */
  async handleTaskApproval(
    instance: ApprovalInstanceEntity,
    task: ApprovalTaskEntity,
    command: ApprovalCommand,
  ): Promise<{ status: string; message: string }> {
    // 更新任务状态
    task.status = ApprovalTaskStatusEnum.APPROVED;
    task.remark = command.remark;
    task.reviserId = command.operatorId;
    task.reviserName = command.operatorName;

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
      instance.reviserId = command.operatorId;
      instance.reviserName = command.operatorName;
      // Todo: 通知
      this.logger.log(
        `推进到下一步: 任务 ${nextTask.id}, 审批人 ${nextTask.approverUserId}`,
      );
    } else {
      // 流程完成
      instance.status = ApprovalInstanceStatusEnum.APPROVED;
      instance.reviserId = command.operatorId;
      instance.reviserName = command.operatorName;
      this.logger.log(`审批流程完成: 实例 ${instance.id}`);
    }
    await this.entityManager.transaction(async (manager) => {
      await Promise.all([manager.save(task), manager.save(instance)]);
    });

    return {
      status: ApprovalTaskStatusEnum.APPROVED,
      message: nextTask ? '审批通过，流程继续' : '审批完成',
    };
  }

  /**
   * 处理审批驳回
   */
  async handleTaskRejection(
    instance: ApprovalInstanceEntity,
    task: ApprovalTaskEntity,
    command: ApprovalCommand,
  ): Promise<{ status: string; message: string }> {
    // 更新任务状态
    // Todo: 如果是ROLE，要更新多个task
    task.status = ApprovalTaskStatusEnum.REJECTED;
    task.remark = command.remark;
    task.reviserId = command.operatorId;
    task.reviserName = command.operatorName;
    // 审批驳回，终止流程
    instance.status = ApprovalInstanceStatusEnum.REJECTED;
    instance.reviserId = command.operatorId;
    instance.reviserName = command.operatorName;
    await this.entityManager.transaction(async (manager) => {
      await Promise.all([manager.save(task), manager.save(instance)]);
    });

    return {
      status: ApprovalInstanceStatusEnum.REJECTED,
      message: '审批已驳回，流程终止',
    };
  }
}
