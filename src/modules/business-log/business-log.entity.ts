import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity({
  name: 'business_log',
  engine: 'InnoDB',
  database: 'seaways_base_business_center',
  synchronize: false,
  comment: '业务操作日志表',
})
@Index('idx_business_id', ['businessId'])
@Index('idx_business_type', ['businessType'])
@Index('idx_created_time', ['createdTime'])
@Index('idx_business_type_id', ['businessType', 'businessId'])
export class BusinessLog {
  @PrimaryColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 64, name: 'business_type' })
  businessType: string;

  @Column({ type: 'bigint', name: 'business_id' })
  businessId: string;

  @Column({ type: 'varchar', length: 128, name: 'action' })
  action: string;

  @Column({ type: 'json', name: 'params', nullable: true })
  params?: any;

  @Column({ type: 'json', name: 'result', nullable: true })
  result?: any;

  @Column({ type: 'varchar', length: 64, name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ type: 'bigint', name: 'creator_id' })
  creatorId: string;

  @Column({ type: 'varchar', length: 255, name: 'creator_name' })
  creatorName: string;

  @CreateDateColumn({
    type: 'datetime',
    precision: 0,
    name: 'created_time',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdTime: Date;

  @Column({ type: 'varchar', length: 128, name: 'operate_program' })
  operateProgram: string;
}
