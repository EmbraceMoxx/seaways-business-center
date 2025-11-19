import { Column, Entity } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('approval_task')
export class ApprovalTaskEntity extends AuditEntity {
  @Column('bigint', { name: 'instance_id' })
  instanceId: string;

  @Column('bigint', { name: 'node_id' })
  nodeId: string;

  @Column('bigint', { name: 'approver_user_id', comment: '审批人用户ID' })
  approverUserId: string;

  @Column('varchar', {
    name: 'status',
    comment:
      '状态: PENDING-待处理, APPROVED-已通过, REJECTED-已拒绝, SKIPPED-已跳过',
    length: 32,
    default: () => "'PENDING'",
  })
  status: string;

  @Column('varchar', {
    name: 'remark',
    nullable: true,
    comment: '审批意见',
    length: 1000,
  })
  remark: string | null;
}
