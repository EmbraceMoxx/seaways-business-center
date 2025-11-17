import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleEngineService } from '@modules/approval/services/rule-engine.service';
import { ApprovalEngineService } from '@modules/approval/services/approval-engine.service';
import { ApprovalTaskService } from '@modules/approval/services/approval-task.service';
import { ApprovalInstanceEntity } from './entities/approval_instance.entity';
import { ApprovalProcessDefinitionEntity } from './entities/approval_process_definition.entity';
import { ApprovalProcessNodeEntity } from './entities/approval_process_node.entity';
import { ApprovalProcessRouterEntity } from './entities/approval_process_router.entity';
import { ApprovalTaskEntity } from './entities/approval_task.entity';

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
  providers: [RuleEngineService, ApprovalEngineService, ApprovalTaskService],
  exports: [RuleEngineService, ApprovalEngineService, ApprovalTaskService],
})
export class ApprovalModule {}
