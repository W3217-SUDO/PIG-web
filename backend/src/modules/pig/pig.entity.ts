import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum PigStatus {
  DRAFT = 'draft',
  LISTED = 'listed',
  SOLD_OUT = 'sold_out',
  CLOSED = 'closed',
}

@Entity('pig')
export class Pig extends BaseEntity {
  /** 商家 user_id */
  @Index()
  @Column({ type: 'char', length: 26, name: 'merchant_id' })
  merchantId!: string;

  @Column({ type: 'varchar', length: 128 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 64, default: '' })
  breed!: string;

  /** 农户 ID(FK 农户.id);MVP 可为 NULL,允许未指派 */
  @Index()
  @Column({ type: 'char', length: 26, nullable: true, name: 'farmer_id' })
  farmerId!: string | null;

  /** 地区(用于列表筛选,冗余字段,跟 farmer.region 同源) */
  @Index()
  @Column({ type: 'varchar', length: 64, default: '' })
  region!: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'weight_kg', default: 0 })
  weightKg!: string;

  /** 预期出栏体重(kg) */
  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'expected_weight_kg', default: 0 })
  expectedWeightKg!: string;

  /** 预录直播视频 URL(v1 用 mock,v2 接真实直播流) */
  @Column({ type: 'varchar', length: 512, default: '', name: 'mock_video_url' })
  mockVideoUrl!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_share' })
  pricePerShare!: string;

  @Column({ type: 'int', name: 'total_shares' })
  totalShares!: number;

  @Column({ type: 'int', name: 'sold_shares', default: 0 })
  soldShares!: number;

  @Column({ type: 'varchar', length: 512, default: '', name: 'cover_image' })
  coverImage!: string;

  /** 相册 URL 数组 */
  @Column({ type: 'json', nullable: true })
  photos!: string[] | null;

  @Index()
  @Column({ type: 'enum', enum: PigStatus, default: PigStatus.DRAFT })
  status!: PigStatus;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'listed_at' })
  listedAt!: Date | null;
}
