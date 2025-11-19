import { Injectable, Logger } from '@nestjs/common';
import { Jexl } from 'jexl';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalProcessNodeEntity } from '../entities/approval-process-node.entity';
import { ApprovalProcessRouterEntity } from '../entities/approval-process-router.entity';
import { ApprovalContext } from '../interfaces/approval-context.interface';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { ApprovalNodeType } from '@src/enums/approval.enum';

@Injectable()
export class RuleEngineService {
  private jexl: Jexl;
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectRepository(ApprovalProcessNodeEntity)
    private nodeRepository: Repository<ApprovalProcessNodeEntity>,
    @InjectRepository(ApprovalProcessRouterEntity)
    private routerRepository: Repository<ApprovalProcessRouterEntity>,
  ) {
    this.jexl = new Jexl();
  }

  /**
   * 计算表达式
   */
  async evaluateExpression(
    expression: string,
    context: ApprovalContext,
  ): Promise<boolean> {
    try {
      if (!expression) return true;

      const result = await this.jexl.eval(expression, context);
      return Boolean(result);
    } catch (error) {
      this.logger.error(`表达式计算失败: ${expression}`, error.stack);
      return false;
    }
  }

  /**
   * 根据当前节点和订单上下文，计算下一个节点
   */
  async calculateNextNode(
    processId: string,
    currentNodeId: string,
    context: ApprovalContext,
  ): Promise<string | null> {
    // 查询当前节点的所有出向路由
    const routers = await this.routerRepository.find({
      where: {
        processId,
        sourceNodeId: currentNodeId,
        deleted: GlobalStatusEnum.NO,
        enabled: GlobalStatusEnum.YES,
      },
    });

    // 按优先级排序
    routers.sort((a, b) => a.priority - b.priority);

    // 遍历路由，计算条件
    for (const router of routers) {
      const conditionMet = await this.evaluateExpression(
        router.conditionExpression,
        context,
      );

      if (conditionMet) {
        return router.targetNodeId;
      }
    }
    // 没有符合条件的路由
    return null;
  }

  /**
   * 预计算审批路径
   */
  // Todo: 审批路径，加上下一步的审批原因？原因用不用动态的？ 审批原因返回出去
  async calculateApprovalPath(
    processId: string,
    context: ApprovalContext,
  ): Promise<ApprovalProcessNodeEntity[]> {
    const nodePath: ApprovalProcessNodeEntity[] = [];

    // 开始节点
    const startNode = await this.nodeRepository.findOneBy({
      processId,
      nodeType: ApprovalNodeType.START,
      deleted: GlobalStatusEnum.NO,
      enabled: GlobalStatusEnum.YES,
    });

    if (!startNode) throw new Error(`未找到流程 ${processId} 的开始节点`);

    let currentNode = startNode;

    while (currentNode) {
      // 获取当前节点的出向路由
      const routers = await this.routerRepository.find({
        where: {
          processId,
          sourceNodeId: currentNode.id,
          deleted: GlobalStatusEnum.NO,
          enabled: GlobalStatusEnum.YES,
        },
      });

      let nextNode: ApprovalProcessNodeEntity;
      // 路由按优先级排序
      const sortedRouters = [...routers].sort(
        (a, b) => a.priority - b.priority,
      );

      for (const router of sortedRouters) {
        const conditionMet = await this.evaluateExpression(
          router.conditionExpression,
          context,
        );
        if (conditionMet) {
          nextNode = await this.nodeRepository.findOneBy({
            id: router.targetNodeId,
            nodeType: ApprovalNodeType.APPROVAL,
            deleted: GlobalStatusEnum.NO,
            enabled: GlobalStatusEnum.YES,
          });
          break;
        }
      }

      if (!nextNode) break;
      currentNode = nextNode;
      nodePath.push(currentNode);
    }

    return nodePath;
  }
}
