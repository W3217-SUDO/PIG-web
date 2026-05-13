import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * 农户档案
 * v1 支持微信 openid 绑定登录，openid 唯一确定农户身份。
 */
@Entity('farmer')
export class Farmer extends BaseEntity {
  /** 真名 / 化名(展示用) */
  @Column({ type: 'varchar', length: 64 })
  name!: string;

  /** 地区(广元 / 绵阳 / 德阳 …),与 pig.region 同源 */
  @Index()
  @Column({ type: 'varchar', length: 64 })
  region!: string;

  /** 散养年限 */
  @Column({ type: 'int', default: 0 })
  years!: number;

  @Column({ type: 'varchar', length: 512, default: '', name: 'avatar_url' })
  avatarUrl!: string;

  /** 农户故事(文案,展示在详情页) */
  @Column({ type: 'text', nullable: true })
  story!: string | null;

  /** 农户介绍视频 URL(选填) */
  @Column({ type: 'varchar', length: 512, default: '', name: 'video_url' })
  videoUrl!: string;

  /** 微信 openid（绑定后唯一标识此农户；NULL 表示尚未绑定微信） */
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  openid!: string | null;

  /** 绑定的微信手机号（选填） */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  /** 微信昵称（首次授权时记录） */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'wx_nickname' })
  wxNickname!: string | null;

  /** 微信头像（首次授权时记录） */
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'wx_avatar' })
  wxAvatar!: string | null;
}
