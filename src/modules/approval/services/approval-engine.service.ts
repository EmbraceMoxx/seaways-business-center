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

  // Todo: 各个环节加上异常处理
  // Todo: 各步骤写操作日志
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
   */
  async startApprovalProcess(
    createDto: CreateApprovalDto,
  ): Promise<ApprovalInstanceEntity> {
    // 查询并验证现有实例
    const existing = await this.instanceService.validateResubmission(
      createDto.orderId,
    );

    // 创建新的审批实例
    return await this.instanceService.createInstance(createDto, existing);
  }

  /**
   * 处理审批操作
   */
  async processApproval(
    command: ApprovalCommand,
    user: JwtUserPayload,
  ): Promise<{ status: string; message: string }> {
    const { orderId } = command;
    const instance = await this.instanceRepository.findOneBy({ orderId });
    if (!instance) throw new BusinessException('审批实例不存在');

    // 获取当前待处理任务
    // Todo: 当前同一步骤，可能有多个任务的
    // Todo: 当前步骤的所有任务查出来
    // Todo: 其中没有操作人是当前操作人的，就报错
    const task = await this.taskRepository.findOneBy({
      instanceId: instance.id,
      nodeId: instance.currentNodeId,
      status: ApprovalTaskStatusEnum.PENDING,
    });
    if (!task) throw new BusinessException('当前无待审批任务');

    // 检查审批权限
    // 检查当前操作人是否是任务的审批人
    if (task.approverUserId !== user.userId) {
      throw new BusinessException(
        `当前操作人 ${user.nickName} 不是此任务的指定审批人`,
      );
    }

    const result = await this.handleCommand(instance, task, command, user);

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

    // 未手动审批过或已驳回才允许取消订单
    const instance = await this.instanceService.validateCancellation(orderId);

    instance.status = ApprovalInstanceStatusEnum.CANCELLED;

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
          reviserName: operatorName,
        },
      );
      await manager.save(instance);
    });

    this.logger.log(
      `审批流程取消成功: 订单 ${orderId}, 操作人 ${operatorName}`,
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
   */
  private async handleCommand(
    instance: ApprovalInstanceEntity,
    task: ApprovalTaskEntity,
    command: ApprovalCommand,
    user: JwtUserPayload,
  ): Promise<{ status: string; message: string }> {
    switch (command.action) {
      case ApprovalActionEnum.AGREE:
        return this.taskService.handleTaskApproval(
          instance,
          task,
          command,
          user,
        );

      case ApprovalActionEnum.REFUSE:
        return this.taskService.handleTaskRejection(
          instance,
          task,
          command,
          user,
        );

      default:
        throw new BusinessException(`不支持的审批操作: ${command.action}`);
    }
  }
}
