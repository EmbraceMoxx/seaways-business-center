import { generateId } from '@src/utils';
import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';

@Entity({
  name: 'order_event',
  engine: 'InnoDB',
  comment: '事件表',
  database: 'seaways_base_business_center',
  synchronize: false,
})
@Index(
  'uniq_business_event_status',
  ['businessId', 'eventType', 'eventStatus'],
  { unique: true },
)
@Index('idx_business_id', ['businessId'])
@Index('idx_event_type', ['eventType'])
@Index('idx_created_time_event_status', ['createdTime', 'eventStatus'])
export class OrderEventEntity {
  @PrimaryColumn({ type: 'bigint', comment: '事件ID 雪花算法生成' })
  id: string;

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 64,
    comment: '事件类型，如：ORDER_PUSH',
  })
  eventType: string;

  @Column({
    name: 'event_app_id',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '触发事件的应用ID',
  })
  eventAppId?: string;

  @Column({
    name: 'event_app_name',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '触发事件的应用名称',
  })
  eventAppName?: string;

  @Column({
    name: 'event_status',
    type: 'tinyint',
    width: 1,
    default: 0,
    comment: '事件处理状态，0-未开始，1-已完成，2-错误',
  })
  eventStatus: number;

  @Column({
    name: 'event_message',
    type: 'varchar',
    length: 1024,
    nullable: true,
    comment: '事件处理信息',
  })
  eventMessage?: string;

  @Column({
    name: 'business_id',
    type: 'bigint',
    comment: '业务ID, 对应订单ID',
  })
  businessId: string;

  @Column({
    name: 'business_title',
    type: 'varchar',
    length: 256,
    nullable: true,
    comment: '业务实例标题',
  })
  businessTitle?: string;

  @Column({
    type: 'json',
    nullable: false,
    default: () => 'JSON_OBJECT()',
    comment: '业务实例详情信息',
  })
  details: Record<string, any>;

  @Column({
    name: 'business_status',
    type: 'varchar',
    length: 32,
    comment: '业务实例的状态',
  })
  businessStatus: string;

  @Column({
    name: 'business_message',
    type: 'varchar',
    length: 1024,
    nullable: true,
    comment: '业务实例处理信息',
  })
  businessMessage?: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'NO',
    comment: '是否删除，YES-删除，NO-未删除',
  })
  deleted: string;

  @CreateDateColumn({
    name: 'created_time',
    type: 'datetime',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间(收到事件时间)',
  })
  createdTime: Date;

  @Column({
    name: 'reviser_id',
    type: 'bigint',
    nullable: true,
    comment: '修改人ID',
  })
  reviserId?: string;

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
    name: 'reviser_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '更新人名字',
  })
  reviserName?: string;

  @Column({
    name: 'last_operate_program',
    type: 'varchar',
    length: 128,
    comment: '最后操作的程序',
  })
  lastOperateProgram: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateId();
    }
  }
}
