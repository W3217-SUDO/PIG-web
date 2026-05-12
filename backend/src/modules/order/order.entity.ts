import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum OrderStatus {
  PENDING = 'pending', // 待支付
  PAID = 'paid', // 已支付(代养中)
  SHIPPED = 'shipped', // 已屠宰/已发货
  DELIVERED = 'delivered', // 已确认收货
  CANCELLED = 'cancelled', // 已取消(支付前)
  REFUND_PENDING = 'refund_pending', // 退款申请中
  REFUNDED = 'refunded', // 已退款
}

export enum OrderPayMethod {
  WXPAY = 'wxpay',
  WALLET = 'wallet',
  MOCK = 'mock', // dev 用
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

  @Column({
    type: 'enum',
    enum: OrderPayMethod,
    nullable: true,
    name: 'pay_method',
  })
  payMethod!: OrderPayMethod | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'wx_pay_transaction_id' })
  wxPayTransactionId!: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'paid_at' })
  paidAt!: Date | null;

  /** 屠宰发货时间(管理端发货时填) */
  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'slaughter_date' })
  slaughterDate!: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'shipped_at' })
  shippedAt!: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'delivered_at' })
  deliveredAt!: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'refunded_at' })
  refundedAt!: Date | null;

  @Column({ type: 'varchar', length: 256, default: '', name: 'refund_reason' })
  refundReason!: string;

  /** 物流单号(发货时填) */
  @Column({ type: 'varchar', length: 64, default: '', name: 'tracking_no' })
  trackingNo!: string;

  /** 收货地址快照(下单时拷贝,后续不变) */
  @Column({ type: 'json', nullable: true, name: 'address_snapshot' })
  addressSnapshot!: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  } | null;

  /** 用户备注 */
  @Column({ type: 'varchar', length: 256, default: '' })
  remark!: string;
}
