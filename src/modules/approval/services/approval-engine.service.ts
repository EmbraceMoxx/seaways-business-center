import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { JwtUserPayload } from '@modules/auth/jwt.strategy';
// Dto
import {
  ApprovalCommand,
  CreateApprovalDto,
  CancelApprovalDto,
} from '@src/dto/approval/approval.dto';
import { BusinessException } from '@src/dto/common/common.dto';
// Entity
import { ApprovalInstanceEntity } from '../entities/approval-instance.entity';
import { ApprovalTaskEntity } from '../entities/approval-task.entity';
// Enum
import {
  ApprovalInstanceStatusEnum,
  ApprovalTaskStatusEnum,
  ApprovalActionEnum,
} from '@src/enums/approval.enum';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
// Service
import { InstanceService } from './instance.service';
import { TaskService } from './task.service';

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(
    @InjectRepository(ApprovalInstanceEntity)
    private instanceRepository: Repository<ApprovalInstanceEntity>,
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
    private instanceService: InstanceService,
    private taskService: TaskService,
    private entityManager: EntityManager,
  ) {}

  /**
   * 启动审批流程
   * @param createDto - 审批创建数据传输对象
   * @returns 审批实例实体
   */
  async startApprovalProcess(
    createDto: CreateApprovalDto,
  ): Promise<ApprovalInstanceEntity> {
    // 查询并验证现有实例
    const existing = await this.instanceService.validateResubmission(
      createDto.orderId,
    );

    // 创建新的审批实例
    return this.instanceService.createInstance(createDto, existing);
  }

  /**
   * 处理审批操作
   * @param command 审批指令，包含订单ID和审批动作等信息
   * @param user 当前用户信息
   */
  async processApproval(
    command: ApprovalCommand,
    user: JwtUserPayload,
  ): Promise<{ status: string; message: string }> {
    const { orderId, action } = command;
    if (!orderId) throw new BusinessException('订单ID不能为空');
    if (!action) throw new BusinessException('审批动作不能为空');

    const instance = await this.instanceRepository.findOneBy({ orderId });
    if (!instance) throw new BusinessException('审批实例不存在');

    // 获取当前节点下所有待处理任务
    // Todo: ROLE的话，后面特殊处理
    const nodeTasks = await this.taskRepository.findBy({
      instanceId: instance.id,
      nodeId: instance.currentNodeId,
    });
    if (!nodeTasks.length) throw new BusinessException('当前无待审批任务');

    // Todo: 如果是ROLE的话，是通过角色验证，还是分多个Task？
    // 检查是否存在分配给当前用户的任务
    const assignedTask = nodeTasks.find(
      (x) => x.approverUserId === user.userId,
    );
    if (!assignedTask) {
      throw new BusinessException(
        `当前操作人 ${user.nickName} 不是此任务的指定审批人`,
      );
    }
    if (assignedTask.status !== ApprovalTaskStatusEnum.PENDING) {
      throw new BusinessException('当前任务状态不是待处理，请勿重复操作');
    }

    // Todo: 所有当前步骤的Task都要处理
    // 审批命令处理逻辑
    const result = await this.handleCommand(
      instance,
      assignedTask,
      nodeTasks,
      command,
      user,
    );

    this.logger.log(
      `审批操作完成: 订单 ${command.orderId}, 操作 ${command.action}`,
    );
    return result;
  }

  /**
   * 取消审批流程
   */
  async cancelApprovalProcess(cancelDto: CancelApprovalDto): Promise<void> {
    const { orderId, operatorId, operatorName, reason } = cancelDto;

    if (!orderId) throw new BusinessException('订单ID不能为空');
    if (!operatorId) throw new BusinessException('操作人ID不能为空');

    // 验证订单是否可以取消（未手动审批过或已驳回的订单才允许取消）
    const instance = await this.instanceService.validateCancellation(orderId);

    instance.status = ApprovalInstanceStatusEnum.CANCELLED;

    // 更新审批任务状态、保存审批实例
    await this.entityManager.transaction(async (manager) => {
      await manager.update(
        ApprovalTaskEntity,
        {
          instanceId: instance.id,
          status: ApprovalTaskStatusEnum.PENDING,
        },
        {
          status: ApprovalTaskStatusEnum.CANCELLED,
          remark: `流程取消: ${reason}`,
          reviserId: operatorId,
          reviserName: operatorName || '',
        },
      );
      await manager.save(instance);
    });

    this.logger.log(
      `审批流程取消成功: 订单 ${orderId}, 操作人 ${operatorName || ''}`,
    );
  }

  /**
   * 获取审批状态
   */
  async getApprovalStatus(orderId: string) {
    const instance = await this.instanceRepository.findOneBy({ orderId });
    if (!instance) throw new BusinessException('审批实例不存在');

    // 获取所有任务并按步骤排序
    const tasks = await this.taskRepository.find({
      where: { instanceId: instance.id },
      order: { taskStep: 'ASC' },
    });

    // 检查是否存在手动审批过的任务
    const hasManualApproval = tasks.some(
      (task) =>
        task.status === ApprovalTaskStatusEnum.APPROVED &&
        task.autoApproved === GlobalStatusEnum.NO,
    );

    const { id, currentNodeId, currentStep, status } = instance;
    return {
      canCancel: !hasManualApproval,
      instance: { id, currentNodeId, currentStep, status },
      tasks: tasks.map(
        ({
          id,
          nodeId,
          taskStep,
          approverUserId,
          status,
          autoApproved,
          remark,
        }) => ({
          id,
          nodeId,
          taskStep,
          approverUserId,
          status,
          autoApproved,
          remark,
        }),
      ),
    };
  }

  /**
   * 处理审批动作
   * @param instance 审批实例
   * @param nodeTasks 当前节点下所有的审批任务
   * @param command 审批指令，包含订单ID和审批动作等信息
   * @param user 当前用户信息
   */
  private async handleCommand(
    instance: ApprovalInstanceEntity,
    assignedTask: ApprovalTaskEntity,
    nodeTasks: ApprovalTaskEntity[],
    command: ApprovalCommand,
    user: JwtUserPayload,
  ): Promise<{ status: string; message: string }> {
    switch (command.action) {
      case ApprovalActionEnum.AGREE:
        return this.taskService.handleTaskApproval(
          instance,
          assignedTask,
          nodeTasks,
          command,
          user,
        );

      case ApprovalActionEnum.REFUSE:
        return this.taskService.handleTaskRejection(
          instance,
          assignedTask,
          nodeTasks,
          command,
          user,
        );

      default:
        throw new BusinessException(`不支持的审批操作: ${command.action}`);
    }
  }
}
