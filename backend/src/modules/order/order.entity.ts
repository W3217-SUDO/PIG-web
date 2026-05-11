import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('order')
export class Order extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Index()
  @Column({ type: 'char', length: 26, name: 'pig_id' })
  pigId!: string;

  @Column({ type: 'int', name: 'shares_count' })
  sharesCount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_price' })
  totalPrice!: string;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'wx_pay_transaction_id' })
  wxPayTransactionId!: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'paid_at' })
  paidAt!: Date | null;
}
