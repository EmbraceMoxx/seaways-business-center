import { Column, Entity } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('approval_process_definition')
export class ApprovalProcessDefinitionEntity extends AuditEntity {
  @Column('varchar', {
    name: 'process_code',
    comment: '流程唯一标识',
    length: 100,
  })
  processCode: string;

  @Column('varchar', { name: 'name', comment: '流程名称', length: 100 })
  name: string;
}
