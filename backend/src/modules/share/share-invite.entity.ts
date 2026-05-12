import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * 拼猪邀请短链(v1 极简版)
 * - 主认领人下单后可生成一条 share_invite,8 位短码 + 30 天 TTL
 * - 受邀人凭 code 调 GET /api/share/:code 看简版订单 + 猪信息
 * - v2 才支持 join / 成员管理 / 权限隔离
 */
@Entity('share_invite')
export class ShareInvite extends BaseEntity {
  /** 8 位短码(UNIQUE,生成时随机) */
  @Index({ unique: true })
  @Column({ type: 'char', length: 8 })
  code!: string;

  @Index()
  @Column({ type: 'char', length: 26, name: 'order_id' })
  orderId!: string;

  /** 主认领人 (= order.userId) */
  @Index()
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;
}
