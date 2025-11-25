import { Injectable, Logger } from '@nestjs/common';
import { Jexl } from 'jexl';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalProcessNodeEntity } from '../entities/approval-process-node.entity';
import { ApprovalProcessRouterEntity } from '../entities/approval-process-router.entity';
import { GlobalStatusEnum } from '@src/enums/global-status.enum';
import { ApprovalNodeTypeEnum } from '@src/enums/approval.enum';
import { CreateApprovalDto } from '@src/dto/approval/approval.dto';

@Injectable()
export class RouterService {
  private jexl: Jexl;
  private readonly logger = new Logger(RouterService.name);

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
    createDto: CreateApprovalDto,
  ): Promise<boolean> {
    try {
      if (!expression) return true;

      const result = await this.jexl.eval(expression, createDto);
      return Boolean(result);
    } catch (error) {
      this.logger.error(`表达式计算失败: ${expression}`, error.stack);
      return false;
    }
  }

  /**
   * 预计算审批路由
   */
  async calRoute(
    processId: string,
    createDto: CreateApprovalDto,
  ): Promise<ApprovalProcessNodeEntity[]> {
    const nodePath: ApprovalProcessNodeEntity[] = [];

    // 开始节点
    const startNode = await this.nodeRepository.findOneBy({
      processId,
      nodeType: ApprovalNodeTypeEnum.START,
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
          createDto,
        );
        if (conditionMet) {
          // Todo: node放到nodeService
          nextNode = await this.nodeRepository.findOneBy({
            id: router.targetNodeId,
            nodeType: ApprovalNodeTypeEnum.APPROVAL,
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

    if (!nodePath?.length) throw new Error('无法计算审批路由');

    return nodePath;
  }
}
