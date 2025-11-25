import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { minBy } from 'lodash';
import { isResubmitAllowed, getResubmitMessage } from './order-status.config';
import { generateId } from '@src/utils';
// Dto
import { BusinessException } from '@src/dto/common/common.dto';
import { CreateApprovalDto } from '@src/dto/approval/approval.dto';
// Entity
import { ApprovalInstanceEntity } from '../entities/approval-instance.entity';
import { ApprovalTaskEntity } from '../entities/approval-task.entity';
import { OrderMainEntity } from '@modules/order/entities/order.main.entity';
// Enum
import {
  ApprovalTaskStatusEnum,
  ApprovalInstanceStatusEnum,
} from '@src/enums/approval.enum';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
// Service
import { ProcessService } from './process.service';
import { RouterService } from './router.service';
import { TaskService } from './task.service';

@Injectable()
export class InstanceService {
  private readonly logger = new Logger(InstanceService.name);

  constructor(
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
    @InjectRepository(ApprovalInstanceEntity)
    private instanceRepository: Repository<ApprovalInstanceEntity>,
    private taskService: TaskService,
    private processService: ProcessService,
    private routerService: RouterService,
    private entityManager: EntityManager,
  ) {}

  /**
   * 创建审批实例
   */
  async createInstance(
    createDto: CreateApprovalDto,
    existingInstance?: ApprovalInstanceEntity,
  ): Promise<ApprovalInstanceEntity> {
    // 获取流程定义
    const process = await this.processService.getProcessDefinition(
      'OFFLINE_ORDER',
    );

    // 计算审批路由
    const nodePath = await this.routerService.calRoute(process.id, createDto);

    const instanceId = generateId();

    // 批量创建审批任务
    const taskPromises = nodePath.map((node, index) =>
      this.taskService.createTask(instanceId, node, createDto, index + 1),
    );
    const tasks: ApprovalTaskEntity[] = await Promise.all(taskPromises);

    // 查找第一个待处理任务
    // Todo: 这里要考虑同一个审批步骤多人处理的情况
    const currentTask = minBy(
      tasks.filter((x) => x.status === ApprovalTaskStatusEnum.PENDING),
      'taskStep',
    );

    return await this.entityManager.transaction(async (manager) => {
      // 清理现有实例
      if (existingInstance) {
        await Promise.all([
          manager.delete(ApprovalTaskEntity, {
            instanceId: existingInstance.id,
          }),
          manager.delete(ApprovalInstanceEntity, existingInstance.id),
        ]);
        this.logger.log(`删除现有审批流程: 实例 ${existingInstance.id}`);
      }

      // 创建新实例
      const instance = await manager.save(ApprovalInstanceEntity, {
        id: instanceId,
        processId: process.id,
        orderId: createDto.orderId,
        ...(currentTask && {
          currentNodeId: currentTask.nodeId,
          currentStep: currentTask.taskStep,
        }),
        status: currentTask
          ? ApprovalInstanceStatusEnum.IN_PROGRESS
          : ApprovalInstanceStatusEnum.APPROVED,
        creatorId: createDto.operatorId,
        creatorName: createDto.operatorName,
        reviserId: createDto.operatorId,
        reviserName: createDto.operatorName,
      });
      await manager.save(ApprovalTaskEntity, tasks);
      this.logger.log(
        `审批启动成功: 实例 ${instance.id}, 任务数 ${tasks.length}`,
      );
      return instance;
    });
  }

  /**
   * 验证是否可以重新提交
   */
  async validateResubmission(
    orderId: string,
  ): Promise<ApprovalInstanceEntity | null> {
    // 查询现有实例
    const instance = await this.instanceRepository.findOneBy({ orderId });

    if (!instance) {
      return null; // 没有现有实例，可以正常提交
    }

    // 检查订单状态
    const currentOrder = await this.entityManager.findOneBy(OrderMainEntity, {
      id: orderId,
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

    return instance;
  }

  /**
   * 验证是否可以取消订单
   */
  async validateCancellation(
    orderId: string,
  ): Promise<ApprovalInstanceEntity | null> {
    // 查询现有实例
    const instance = await this.instanceRepository.findOneBy({ orderId });
    if (!instance) throw new BusinessException('审批实例不存在');

    // 检查订单状态
    // Todo: 订单判断从orderCheckService拿
    const currentOrder = await this.entityManager.findOneBy(OrderMainEntity, {
      id: orderId,
    });
    if (!currentOrder) throw new BusinessException('未找到关联的订单');

    const instanceStatus = instance.status;
    // 流程已驳回，可以取消审批
    if (instanceStatus === ApprovalInstanceStatusEnum.REJECTED) {
      return instance;
    }

    // 检查任务审批状态
    const task = await this.taskRepository.findOneBy({
      instanceId: instance.id,
      status: ApprovalTaskStatusEnum.APPROVED,
      autoApproved: GlobalStatusEnum.NO, // 非自动审批
    });
    if (task) throw new BusinessException('流程已被审批过，请先驳回申请');

    return instance;
  }
}
