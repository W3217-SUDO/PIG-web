import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum MessageType {
  ORDER_PAID = 'order_paid', // 订单支付成功
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_SHIPPED = 'order_shipped', // 已屠宰/已发货
  ORDER_DELIVERED = 'order_delivered', // 已确认收货
  ORDER_REFUND_PENDING = 'order_refund_pending', // 退款申请中
  ORDER_REFUNDED = 'order_refunded', // 已退款
  PIG_UPDATE = 'pig_update', // 猪有更新(喂养/健康)
  SHARE = 'share', // 拼猪相关
  SYSTEM = 'system', // 系统通知
}

@Entity('message')
@Index(['userId', 'isRead', 'createdAt'])
export class Message extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: MessageType })
  type!: MessageType;

  @Column({ type: 'varchar', length: 128 })
  title!: string;

  @Column({ type: 'varchar', length: 512, default: '' })
  content!: string;

  /** 关联 ID(order_id / pig_id / share_code) */
  @Column({ type: 'varchar', length: 32, default: '', name: 'related_id' })
  relatedId!: string;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead!: boolean;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'read_at' })
  readAt!: Date | null;
}
