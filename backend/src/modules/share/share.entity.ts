import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * 订单支付成功后,把 Order 拆成份额落账;
 * 一条 Share 表示某用户在某头猪上持有的一笔份额(每个 Order 通常对应 1 条 Share)
 */
@Entity('share')
export class Share extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, name: 'order_id' })
  orderId!: string;

  @Index()
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Index()
  @Column({ type: 'char', length: 26, name: 'pig_id' })
  pigId!: string;

  @Column({ type: 'int', name: 'shares_count' })
  sharesCount!: number;
}
