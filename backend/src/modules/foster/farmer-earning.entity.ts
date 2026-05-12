import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** 代养人月度收益记录 */
@Entity('farmer_earning')
@Unique(['farmerId', 'year', 'month'])
export class FarmerEarning extends BaseEntity {
  @Column({ type: 'char', length: 26, name: 'farmer_id' })
  farmerId!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int' })
  month!: number;

  /** 当月收益(元) */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;
}
