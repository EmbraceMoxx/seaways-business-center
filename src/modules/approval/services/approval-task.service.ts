import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalTaskEntity } from '../entities/approval_task.entity';
import { ApprovalTaskStatusEnum } from '@src/enums/approval.enum';

@Injectable()
export class ApprovalTaskService {
  constructor(
    @InjectRepository(ApprovalTaskEntity)
    private taskRepository: Repository<ApprovalTaskEntity>,
  ) {}

  /**
   * 获取用户的待办审批任务
   */
  // Todo: 要和approval_instance、orders、approval_process_node关联
  // Todo: 如果要用，还得考虑可以看上下级的
  async getPendingTasks(userId: string): Promise<ApprovalTaskEntity[]> {
    return this.taskRepository.find({
      where: { approverUserId: userId, status: ApprovalTaskStatusEnum.PENDING },
      order: { createdTime: 'DESC' },
    });
  }

  /**
   * 获取审批任务详情
   */
  // Todo: 要和approval_instance、orders、approval_process_node关联
  async getTaskDetail(taskId: string): Promise<ApprovalTaskEntity> {
    const task = await this.taskRepository.findOneBy({ id: taskId });

    if (!task) {
      throw new NotFoundException('审批任务不存在');
    }

    return task;
  }

  /**
   * 获取审批任务的审批历史
   */
  // Todo: 要和approval_process_node关联
  async getTaskHistory(instanceId: string): Promise<ApprovalTaskEntity[]> {
    return this.taskRepository.find({
      where: { instanceId },
      order: { createdTime: 'ASC' },
    });
  }
}
