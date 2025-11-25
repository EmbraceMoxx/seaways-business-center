import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
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
// Service
import { InstanceService } from './instance.service';
import { TaskService } from './task.service';

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  // Todo: 各个环节加上异常处理
  // Todo: 各步骤写操作日志
  // Todo: 加一个订单取消，也要更新审批实例（还是直接在订单取消的地方处理？）
  // Todo: 查询订单是否被驳回过
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
      createDto.operatorId,
    );

    // 创建新的审批实例
    return await this.instanceService.createInstance(createDto, existing);
  }

  /**
   * 处理审批操作
   */
  async processApproval(
    command: ApprovalCommand,
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
    if (task.approverUserId !== command.operatorId) {
      throw new BusinessException(
        `当前操作人 ${command.operatorName} 不是此任务的指定审批人`,
      );
    }

    const result = await this.handleCommand(instance, task, command);

    this.logger.log(
      `审批操作完成: 订单 ${command.orderId}, 操作 ${command.action}`,
    );
    return result;
  }

  /**
   * 取消审批流程
   */
  async cancelApprovalProcess(cancelDto: CancelApprovalDto) {
    // Todo: 未审批或已驳回才允许取消订单
    const { orderId, operatorId, operatorName, reason } = cancelDto;

    const instance = await this.instanceRepository.findOneBy({ orderId });
    if (!instance) throw new BusinessException('审批实例不存在');

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

    // Todo: 写入操作日志，返回流程状态
    return { instance };
  }

  /**
   * 获取审批状态
   */
  async getApprovalStatus(orderId: string) {
    const instance = await this.instanceRepository.findOneBy({ orderId });
    if (!instance) throw new BusinessException('审批实例不存在');

    const currentTask = await this.taskRepository.find({
      where: {
        instanceId: instance.id,
        status: ApprovalTaskStatusEnum.PENDING,
      },
      order: { taskStep: 'ASC' },
    });

    return {
      // Todo: 审批状态，当前步骤，当前审批人（数组）
      instance,
      currentTask,
    };
  }

  /**
   * 处理审批动作
   */
  private async handleCommand(
    instance: ApprovalInstanceEntity,
    task: ApprovalTaskEntity,
    command: ApprovalCommand,
  ): Promise<{ status: string; message: string }> {
    switch (command.action) {
      case ApprovalActionEnum.AGREE:
        return this.taskService.handleTaskApproval(instance, task, command);

      case ApprovalActionEnum.REFUSE:
        return this.taskService.handleTaskRejection(instance, task, command);

      default:
        throw new BusinessException(`不支持的审批操作: ${command.action}`);
    }
  }
}
