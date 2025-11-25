import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalProcessDefinitionEntity } from '../entities/approval-process-definition.entity';
import { BusinessException } from '@src/dto/common/common.dto';

@Injectable()
export class ProcessService {
  private readonly logger = new Logger(ProcessService.name);

  constructor(
    @InjectRepository(ApprovalProcessDefinitionEntity)
    private processRepository: Repository<ApprovalProcessDefinitionEntity>,
  ) {}

  // 获取流程定义
  async getProcessDefinition(
    processCode: string,
  ): Promise<ApprovalProcessDefinitionEntity> {
    const process = await this.processRepository.findOneBy({ processCode });
    if (!process) {
      this.logger.log(`未找到审批流程定义。流程标识: ${processCode}`);
      throw new BusinessException('未找到审批流程定义');
    }
    return process;
  }
}
