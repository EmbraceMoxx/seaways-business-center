import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalProcessNodeEntity } from '../entities/approval-process-node.entity';

@Injectable()
export class NodeService {
  private readonly logger = new Logger(NodeService.name);

  constructor(
    @InjectRepository(ApprovalProcessNodeEntity)
    private nodeRepository: Repository<ApprovalProcessNodeEntity>,
  ) {}
}
