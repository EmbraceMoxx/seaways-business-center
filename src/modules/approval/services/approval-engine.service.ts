import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalInstanceEntity } from '../entities/approval_instance.entity';
import { ApprovalProcessDefinitionEntity } from '../entities/approval_process_definition.entity';
import { ApprovalProcessNodeEntity } from '../entities/approval_process_node.entity';
import { ApprovalTaskEntity } from '../entities/approval_task.entity';
import { RuleEngineService } from './rule-engine.service';
import { ApprovalContext } from '../interfaces/approval-context.interface';
import {
  ApprovalTaskStatusEnum,
  ApprovalInstanceStatusEnum,
  ApprovalActionEnum,
} from '@src/enums/approval.enum';
import { TaskApprovalDto } from '@src/dto';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class ApprovalEngineService implements OnModuleInit {
  constructor(
    @InjectRepository(ApprovalInstanceEntity)
    private instanceRepository: Repository<ApprovalInstanceEntity>,
    @InjectRepository(ApprovalProcessDefinitionEntity)
    private processRepository: Repository<ApprovalProcessDefinitionEntity>,
    @InjectRepository(ApprovalProcessNodeEntity)
    private nodeRepository: Repository<ApprovalProcessNodeEntity>,
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
    private ruleEngineService: RuleEngineService,
  ) {}
  async onModuleInit() {
    // this.startApprovalProcess({
    //   order: {
    //     id: '645870245705289728',
    //     creatorId: '1',
    //     customerId: '1146656387023851520',
    //     regionalHeadId: '',
    //     provincialHeadId: '',
    //     usedReplenishRatio: 0.06,
    //     usedAuxiliarySalesRatio: 0.01,
    //   },
    //   operator: {
    //     id: '1',
    //     name: 'admin',
    //   },
    // });
  }

  /**
   * 提交订单并启动审批流程
   */
  async startApprovalProcess(
    context: ApprovalContext,
  ): Promise<ApprovalInstanceEntity> {
    const { id: processId } = await this.processRepository.findOneBy({
      processCode: 'OFFLINE_ORDER',
    });

    if (!processId) {
      throw new NotFoundException('未找到适用的审批流程定义');
    }

    // 计算完整的审批路径
    // Todo: 审批路径，加上下一步的审批原因？原因用不用动态的？
    const nodePath = await this.ruleEngineService.calculateApprovalPath(
      processId,
      context,
    );

    if (!nodePath?.length) {
      throw new Error('无法计算审批路径');
    }

    const { operator } = context;

    // 创建审批实例
    const instance = this.instanceRepository.create({
      processId,
      orderId: context.order.id,
      currentNodeId: nodePath[0].id,
      status: ApprovalInstanceStatusEnum.IN_PROGRESS,
      creatorId: operator.id,
      creatorName: operator.name,
      reviserId: operator.id,
      reviserName: operator.name,
    });
    const savedInstance = await this.instanceRepository.save(instance);

    // Todo: 审批任务和审批实例，要放在一个事务中
    // Todo: 不要单个单个保存，全部算完再批量保存
    // 为路径中的每个节点创建审批任务
    for (const nodeId of nodePath) {
      await this.createApprovalTask(savedInstance.id, nodeId.id, context);
    }

    return savedInstance;
  }

  /**
   * 创建审批任务
   */
  private async createApprovalTask(
    instanceId: string,
    nodeId: string,
    context: ApprovalContext,
  ): Promise<ApprovalTaskEntity> {
    const node = await this.nodeRepository.findOneBy({ id: nodeId });
    if (!node) {
      throw new NotFoundException(`审批节点不存在: ${nodeId}`);
    }

    // 根据节点角色和业务规则计算具体的审批人
    const approverUserId = await this.calculateApproverUserId(node, context);

    const { operator } = context;
    const task = this.taskRepository.create({
      instanceId,
      nodeId,
      approverUserId,
      status: ApprovalTaskStatusEnum.PENDING,
      creatorId: operator.id,
      creatorName: operator.name,
      reviserId: operator.id,
      reviserName: operator.name,
    });

    return this.taskRepository.save(task);
  }

  /**
   * 审批任务处理
   */
  async processTaskApproval(taskApproval: TaskApprovalDto) {
    const { taskId, action, remark } = taskApproval;
    // Todo: 按需和 instance和 node 关联
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('审批任务不存在');
    }

    // 更新任务状态
    task.status =
      action == ApprovalActionEnum.AGREE
        ? ApprovalTaskStatusEnum.APPROVED
        : ApprovalTaskStatusEnum.REJECTED;
    task.remark = remark;
    await this.taskRepository.save(task);

    if (action != ApprovalActionEnum.AGREE) {
      // 审批驳回，终止流程
      await this.instanceRepository.update(task.instanceId, {
        status: ApprovalInstanceStatusEnum.REJECTED,
      });
      return ApprovalInstanceStatusEnum.REJECTED;
    }

    // 审批通过，推进流程
    await this.moveToNextNode(task.instanceId, task.nodeId);
    return ApprovalTaskStatusEnum.APPROVED;
  }

  /**
   * 推进到下一个审批节点
   */
  private async moveToNextNode(
    instanceId: string,
    currentNodeId: string,
  ): Promise<void> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    // 构建审批上下文
    const context: ApprovalContext = {
      order: {
        id: instance.orderId,
        creatorId: '0',
        customerId: '',
        regionalHeadId: '',
        provincialHeadId: '',
        usedReplenishRatio: 0.5,
        usedAuxiliarySalesRatio: 0.1,
      },
      operator: { id: '', name: '' },
    };

    // 使用规则引擎计算下一个节点
    const nextNodeId = await this.ruleEngineService.calculateNextNode(
      instance.processId,
      currentNodeId,
      context,
    );

    if (nextNodeId) {
      // 更新实例当前节点
      instance.currentNodeId = nextNodeId;
      await this.instanceRepository.save(instance);

      // 激活下一个节点的任务
      await this.activateNextTask(instanceId, nextNodeId);
    } else {
      // 没有下一个节点，流程完成
      instance.status = ApprovalInstanceStatusEnum.APPROVED;
      await this.instanceRepository.save(instance);

      // Todo: 更新订单状态，注意事务
      // await this.orderService.updateOrderStatus(instance.orderId, 'APPROVED');
    }
  }

  private async calculateApproverUserId(
    node: ApprovalProcessNodeEntity,
    context: ApprovalContext,
  ): Promise<string> {
    // Todo: 根据角色和业务规则查询具体的审批人
    return '1';
  }

  private async getCurrentStep(instanceId: string): Promise<number> {
    const tasks = await this.taskRepository.find({
      where: { instanceId },
      order: { createdTime: 'ASC' },
    });

    return (
      tasks.filter((t) => t.status === ApprovalTaskStatusEnum.APPROVED).length +
      1
    );
  }

  private async activateNextTask(
    instanceId: string,
    nodeId: string,
  ): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { instanceId, nodeId },
    });

    if (task && task.status === ApprovalTaskStatusEnum.PENDING) {
      // Todo: 发通知给相关审批人
      console.log(`审批任务: ${task.id}, 审批人: ${task.approverUserId}`);
    }
  }
}
