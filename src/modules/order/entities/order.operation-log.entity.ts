import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'order_operation_log',
  engine: 'InnoDB',
  comment: '订单操作日志表',
  database: 'seaways-base-business-center',
  synchronize: false,
})
@Index('idx_business_id', ['businessId'])
@Index('idx_created_time', ['createdTime'])
@Index('idx_operation_type', ['operationType'])
export class OrderOperationLog {
  @PrimaryColumn({ type: 'bigint', comment: '操作日志ID，雪花算法生成' })
  id: string;

  @Column({
    name: 'business_id',
    type: 'bigint',
    comment: '订单ID',
  })
  businessId: string;

  @Column({
    name: 'operation_type',
    type: 'varchar',
    length: 64,
    comment:
      '操作类型，例如：ORDER_CREATE、SUBMIT、AUDIT_PASS、AUDIT_REJECT、PUSH_ERP、CANCEL 等',
  })
  operationType: string;

  @Column({
    name: 'operation_desc',
    type: 'varchar',
    length: 1024,
    nullable: true,
    comment: '操作描述',
  })
  operationDesc?: string;

  @Column({
    name: 'before_json',
    type: 'json',
    nullable: true,
    comment: '操作前的订单数据快照（可选）',
  })
  beforeJson?: object;

  @Column({
    name: 'after_json',
    type: 'json',
    nullable: true,
    comment: '操作后的订单数据快照（可选）',
  })
  afterJson?: object;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'NO',
    comment: '是否删除，YES-删除，NO-未删除',
  })
  deleted: string;

  @Column({
    name: 'creator_id',
    type: 'bigint',
    comment: '操作人ID',
  })
  creatorId: string;

  @Column({
    name: 'creator_name',
    type: 'varchar',
    length: 255,
    comment: '操作人姓名',
  })
  creatorName: string;

  @CreateDateColumn({
    name: 'created_time',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
    comment: '操作时间',
  })
  createdTime: Date;

  @Column({
    name: 'reviser_id',
    type: 'bigint',
    nullable: true,
    comment: '修改人ID',
  })
  reviserId?: string;

  @Column({
    name: 'reviser_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '修改人名字',
  })
  reviserName?: string;

  @UpdateDateColumn({
    name: 'revised_time',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: '修改时间',
  })
  revisedTime: Date;

  @Column({
    name: 'last_operate_program',
    type: 'varchar',
    length: 128,
    comment: '最后操作的程序',
  })
  lastOperateProgram: string;
}
