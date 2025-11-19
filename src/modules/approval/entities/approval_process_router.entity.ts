import { Column, Entity } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('approval_process_router')
export class ApprovalProcessRouterEntity extends AuditEntity {
  @Column('bigint', { name: 'process_id' })
  processId: string;

  @Column('bigint', { name: 'source_node_id', comment: '来源节点ID' })
  sourceNodeId: string;

  @Column('bigint', { name: 'target_node_id', comment: '目标节点ID' })
  targetNodeId: string;

  @Column('varchar', {
    name: 'condition_expression',
    nullable: true,
    comment: '条件表达式',
    length: 1000,
  })
  conditionExpression: string | null;

  @Column('tinyint', {
    name: 'priority',
    nullable: true,
    comment: '路由优先级',
    default: () => "'1'",
  })
  priority: number | null;

  @Column('varchar', {
    name: 'remark',
    nullable: true,
    comment: '备注',
    length: 255,
  })
  remark: string | null;
}
