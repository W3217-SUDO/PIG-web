import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

/**
 * 喂养打卡记录
 * v1 全部由 seed 写入(mock 数据);v2 接农户端 POST。
 */
@Entity('feeding_record')
@Index(['pigId', 'checkedAt'])
export class FeedingRecord extends BaseEntity {
  @Column({ type: 'char', length: 26, name: 'pig_id' })
  pigId!: string;

  @Column({ type: 'enum', enum: MealType, name: 'meal_type' })
  mealType!: MealType;

  /** 食材描述 */
  @Column({ type: 'varchar', length: 256, default: '', name: 'food_desc' })
  foodDesc!: string;

  /** 打卡照片 URL(选填) */
  @Column({ type: 'varchar', length: 512, default: '', name: 'image_url' })
  imageUrl!: string;

  /** 打卡时间(可不同于 createdAt,允许补卡) */
  @Index()
  @Column({ type: 'datetime', precision: 3, name: 'checked_at' })
  checkedAt!: Date;
}
