import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleEngineService } from '@modules/approval/services/rule-engine.service';
import { ApprovalEngineService } from '@modules/approval/services/approval-engine.service';
import { ApprovalInstanceEntity } from './entities/approval-instance.entity';
import { ApprovalProcessDefinitionEntity } from './entities/approval-process-definition.entity';
import { ApprovalProcessNodeEntity } from './entities/approval-process-node.entity';
import { ApprovalProcessRouterEntity } from './entities/approval-process-router.entity';
import { ApprovalTaskEntity } from './entities/approval-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalInstanceEntity,
      ApprovalProcessDefinitionEntity,
      ApprovalProcessNodeEntity,
      ApprovalProcessRouterEntity,
      ApprovalTaskEntity,
    ]),
  ],
  providers: [RuleEngineService, ApprovalEngineService],
  exports: [RuleEngineService, ApprovalEngineService],
})
export class ApprovalModule {}
