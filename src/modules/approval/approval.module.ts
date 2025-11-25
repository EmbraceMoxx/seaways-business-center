import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalController } from '@modules/approval/controllers/approval.controller';
// Entity
import { ApprovalInstanceEntity } from './entities/approval-instance.entity';
import { ApprovalProcessDefinitionEntity } from './entities/approval-process-definition.entity';
import { ApprovalProcessNodeEntity } from './entities/approval-process-node.entity';
import { ApprovalProcessRouterEntity } from './entities/approval-process-router.entity';
import { ApprovalTaskEntity } from './entities/approval-task.entity';
import { BusinessLogEntity } from '@modules/common/business-log/entity/business-log.entity';
// Service
import { ApprovalEngineService } from '@modules/approval/services/approval-engine.service';
import { BusinessLogService } from '@modules/common/business-log/business-log.service';
import { InstanceService } from '@modules/approval/services/instance.service';
import { ProcessService } from '@modules/approval/services/process.service';
import { RouterService } from '@modules/approval/services/router.service';
import { TaskService } from '@modules/approval/services/task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalInstanceEntity,
      ApprovalProcessDefinitionEntity,
      ApprovalProcessNodeEntity,
      ApprovalProcessRouterEntity,
      ApprovalTaskEntity,
      BusinessLogEntity,
    ]),
  ],
  providers: [
    ApprovalEngineService,
    InstanceService,
    RouterService,
    ProcessService,
    TaskService,
    BusinessLogService,
  ],
  controllers: [ApprovalController],
  exports: [ApprovalEngineService],
})
export class ApprovalModule {}
