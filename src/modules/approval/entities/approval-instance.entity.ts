import { Column, Entity, Index } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Index('uni_order_id', ['orderId'], { unique: true })
@Entity('approval_instance')
export class ApprovalInstanceEntity extends AuditEntity {
  @Column('bigint', { name: 'process_id' })
  processId: string;

  @Column('bigint', { name: 'order_id' })
  orderId: string;

  @Column('bigint', {
    name: 'current_node_id',
    nullable: true,
    comment: '当前审批节点ID',
  })
  currentNodeId: string | null;

  @Column('int', {
    name: 'current_step',
    nullable: true,
    comment: '当前审批步骤',
  })
  currentStep: number | null;

  @Column('varchar', {
    name: 'status',
    comment:
      '状态: IN_PROGRESS-审批中, APPROVED-已通过, REJECTED-已拒绝, CANCELLED-已取消',
    length: 32,
    default: () => "'IN_PROGRESS'",
  })
  status: string;
}
