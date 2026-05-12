import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum HealthRecordType {
  CHECKUP = 'checkup', // 体检
  VACCINE = 'vaccine', // 疫苗
  VET = 'vet', // 兽医出诊
  EVENT = 'event', // 异常事件(受伤 / 生病)
  WEIGHT = 'weight', // 称重
}

/**
 * 健康档案记录
 * v1 全部 seed mock;v2 接农户/兽医端 POST。
 *
 * 注意:这个 entity 跟 modules/health(健康检查模块) **不是一回事**——
 * 后者是系统 /api/health 探活,本 entity 是猪的健康档案。
 */
@Entity('health_record')
@Index(['pigId', 'recordedAt'])
export class HealthRecord extends BaseEntity {
  @Column({ type: 'char', length: 26, name: 'pig_id' })
  pigId!: string;

  @Column({ type: 'enum', enum: HealthRecordType, name: 'record_type' })
  recordType!: HealthRecordType;

  /** 详细描述(疫苗名 / 体检结果 / 异常说明…) */
  @Column({ type: 'varchar', length: 512 })
  detail!: string;

  @Column({ type: 'varchar', length: 512, default: '', name: 'image_url' })
  imageUrl!: string;

  @Index()
  @Column({ type: 'datetime', precision: 3, name: 'recorded_at' })
  recordedAt!: Date;
}
