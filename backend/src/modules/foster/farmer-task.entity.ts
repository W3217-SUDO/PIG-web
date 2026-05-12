import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum FarmerMealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
}

/** 代养人每日喂养任务 */
@Entity('farmer_task')
@Index(['farmerId', 'scheduledDate'])
export class FarmerTask extends BaseEntity {
  @Column({ type: 'char', length: 26, name: 'farmer_id' })
  farmerId!: string;

  @Column({ type: 'char', length: 26, nullable: true, name: 'pig_id' })
  pigId!: string | null;

  @Column({ type: 'enum', enum: FarmerMealType, name: 'meal_type' })
  mealType!: FarmerMealType;

  /** 食材描述 e.g. "玉米面粥+青菜" */
  @Column({ type: 'varchar', length: 256, default: '', name: 'food_desc' })
  foodDesc!: string;

  /** 栏位/区域 e.g. "A区-03栏" */
  @Column({ type: 'varchar', length: 64, default: '' })
  area!: string;

  /** 时间段 e.g. "07:00-08:00" */
  @Column({ type: 'varchar', length: 32, default: '', name: 'time_slot' })
  timeSlot!: string;

  /** 日期 YYYY-MM-DD */
  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate!: string;

  /** 打卡时间 — 非 null 即为已完成 */
  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'checked_at' })
  checkedAt!: Date | null;

  @Column({ type: 'varchar', length: 512, default: '', name: 'image_url' })
  imageUrl!: string;
}
