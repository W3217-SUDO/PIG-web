import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('wallet')
export class Wallet extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  frozen!: string;
}
