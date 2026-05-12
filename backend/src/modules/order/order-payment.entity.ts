import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum PaymentChannel {
  WXPAY = 'wxpay',
  MOCK = 'mock', // dev mock 支付
  WALLET = 'wallet', // 钱包余额支付(v1.5)
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CLOSED = 'closed',
}

/**
 * 支付流水(一笔订单可能有多条流水,例如第一次失败 + 重试成功)
 * 微信支付回调要幂等 → transaction_id 唯一索引
 */
@Entity('order_payment')
export class OrderPayment extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, name: 'order_id' })
  orderId!: string;

  @Column({ type: 'enum', enum: PaymentChannel, default: PaymentChannel.WXPAY })
  channel!: PaymentChannel;

  /** 微信预支付单号 prepay_id(可选,通知前为空) */
  @Column({ type: 'varchar', length: 64, default: '', name: 'prepay_id' })
  prepayId!: string;

  /** 微信交易号(transaction_id, notify 回调收到的) */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'transaction_id' })
  transactionId!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Index()
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  /** 原始回调 payload(签名校验后存) */
  @Column({ type: 'json', nullable: true, name: 'raw_payload' })
  rawPayload!: Record<string, unknown> | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'succeeded_at' })
  succeededAt!: Date | null;
}
