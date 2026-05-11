import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum UserRole {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  BANNED = 'banned',
}

@Entity('user')
export class User extends BaseEntity {
  /** 微信小程序 openid */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  openid!: string;

  /** 微信开放平台 unionid(跨小程序/APP 同一用户) */
  @Index({ unique: true, where: 'unionid IS NOT NULL' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  unionid!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 64, default: '' })
  nickname!: string;

  @Column({ type: 'varchar', length: 512, default: '', name: 'avatar_url' })
  avatarUrl!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'last_login_at' })
  lastLoginAt!: Date | null;
}
