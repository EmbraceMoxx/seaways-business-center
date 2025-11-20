import { Column, Entity } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('approval_process_node')
export class ApprovalProcessNodeEntity extends AuditEntity {
  @Column('bigint', { name: 'process_id', comment: '所属流程定义ID' })
  processId: string;

  @Column('varchar', { name: 'node_type', comment: '节点类型', length: 20 })
  nodeType: string;

  @Column('varchar', { name: 'node_name', comment: '节点名称', length: 100 })
  nodeName: string;

  @Column('int', { name: 'node_order', comment: '节点顺序' })
  nodeOrder: number;

  @Column('varchar', {
    name: 'assignee_type',
    comment:
      '审批人指定方式: ROLE-按角色, USER-按指定用户, CUSTOMER_RESPONSIBLE-按客户负责人',
    length: 50,
  })
  assigneeType: string;

  @Column('varchar', {
    name: 'assignee_value',
    comment: '审批人配置值',
    length: 100,
  })
  assigneeValue: string;

  @Column('varchar', {
    name: 'approval_strategy',
    comment: '审批策略: ANY_ONE-任意一人通过, ALL-全部通过',
    length: 20,
  })
  approvalStrategy: string;

  @Column('varchar', {
    name: 'enabled',
    nullable: true,
    comment: '是否启用，YES-启用，NO-禁用',
    length: 10,
    default: () => "'YES'",
  })
  enabled: string | null;

  @Column('varchar', {
    name: 'deleted',
    nullable: true,
    comment: '是否删除，YES-删除，NO-未删除',
    length: 10,
    default: () => "'NO'",
  })
  deleted: string | null;
}
