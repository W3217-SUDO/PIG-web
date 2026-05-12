import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TxDirection {
  IN = 'in',
  OUT = 'out',
}

export enum TxType {
  TOPUP = 'topup', // 充值
  ORDER_PAY = 'order_pay', // 下单扣款
  DAILY_CHARGE = 'daily_charge', // 每日代养费
  REFUND = 'refund', // 退款
  ADJUST = 'adjust', // 运营手动调整
}

@Entity('wallet_transaction')
@Index(['walletId', 'createdAt'])
export class WalletTransaction extends BaseEntity {
  @Column({ type: 'char', length: 26, name: 'wallet_id' })
  walletId!: string;

  @Index()
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: TxDirection })
  direction!: TxDirection;

  @Column({ type: 'enum', enum: TxType })
  type!: TxType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  /** 关联 ID(order_id / payment_id / 等) */
  @Column({ type: 'char', length: 26, default: '', name: 'related_id' })
  relatedId!: string;

  /** 余额(后置:本次变动后的余额) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'balance_after' })
  balanceAfter!: string;

  @Column({ type: 'varchar', length: 256, default: '' })
  note!: string;
}
