import { Injectable, Logger } from '@nestjs/common';
import { Jexl } from 'jexl';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalProcessNodeEntity } from '../entities/approval_process_node.entity';
import { ApprovalProcessRouterEntity } from '../entities/approval_process_router.entity';
import { ApprovalContext } from '../interfaces/approval-context.interface';

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

    // 添加自定义函数
    this.addCustomFunctions();
  }

  // Todo: 封装具体用法
  private addCustomFunctions(): void {
    // 添加金额范围判断函数
    this.jexl.addFunction('amountBetween', (amount, min, max) => {
      return amount >= min && amount <= max;
    });

    // 添加角色检查函数
    this.jexl.addFunction('hasRole', (user, role) => {
      const userRoles = this.getUserRoles(user);
      return userRoles.includes(role);
    });

    // 添加额度检查函数
    this.jexl.addFunction('quotaExceeds', (quota, threshold) => {
      return quota > threshold;
    });
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
      where: { processId, sourceNodeId: currentNodeId },
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
   * 预计算完整的审批路径
   */
  async calculateApprovalPath(
    processId: string,
    context: ApprovalContext,
  ): Promise<ApprovalProcessNodeEntity[]> {
    const nodePath: ApprovalProcessNodeEntity[] = [];

    // 获取开始节点
    const startNode = await this.nodeRepository.findOne({
      where: { processId },
      order: { nodeOrder: 'ASC' },
    });

    let currentNode = startNode;

    while (currentNode) {
      nodePath.push(currentNode);

      // 获取当前节点的出向路由
      const routers = await this.routerRepository.find({
        where: { processId, sourceNodeId: currentNode.id },
      });

      let nextNode: ApprovalProcessNodeEntity;
      // routers按优先级排序
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
          });
          break;
        }
      }

      if (!nextNode) break;
      currentNode = nextNode;
    }

    return nodePath;
  }

  private getUserRoles(userId: string): string[] {
    // Todo: 从数据库中查
    return ['user']; // 默认角色
  }
}
