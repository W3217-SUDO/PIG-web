import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ShareMemberRole {
  HOST = 'host',
  MEMBER = 'member',
}

@Entity('share_member')
@Index(['inviteId', 'userId'], { unique: true })
export class ShareMember extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, name: 'invite_id' })
  inviteId!: string;

  @Index()
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: ShareMemberRole, default: ShareMemberRole.MEMBER })
  role!: ShareMemberRole;

  @Column({ type: 'datetime', precision: 3, name: 'joined_at' })
  joinedAt!: Date;
}
