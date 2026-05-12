import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * 农户档案
 * v1 由运营手工 Navicat 录入,无写入 API。
 * 公开 `GET /api/farmers/:id` 只读。
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
}
