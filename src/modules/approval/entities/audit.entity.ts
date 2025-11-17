import {
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateId } from '@src/utils';

export abstract class AuditEntity {
  @PrimaryColumn({ name: 'id', type: 'bigint' })
  id: string;

  @CreateDateColumn({ name: 'created_time', comment: '创建时间' })
  createdTime: Date;

  @Column('bigint', { name: 'creator_id', nullable: true, comment: '创建人id' })
  creatorId: string | null;

  @Column('varchar', {
    name: 'creator_name',
    nullable: true,
    comment: '创建人名字',
    length: 255,
  })
  creatorName: string | null;

  @UpdateDateColumn({ name: 'revised_time', comment: '更新时间' })
  revisedTime: Date;

  @Column('bigint', { name: 'reviser_id', nullable: true, comment: '更新人id' })
  reviserId: string | null;

  @Column('varchar', {
    name: 'reviser_name',
    nullable: true,
    comment: '更新人名字',
    length: 255,
  })
  reviserName: string | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateId();
    }
  }
}
