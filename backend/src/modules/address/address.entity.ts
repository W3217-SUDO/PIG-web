import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('address')
@Index(['userId', 'isDefault'])
export class Address extends BaseEntity {
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId!: string;

  /** 收件人姓名 */
  @Column({ type: 'varchar', length: 32 })
  name!: string;

  /** 收件人手机 */
  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 32 })
  province!: string;

  @Column({ type: 'varchar', length: 32 })
  city!: string;

  @Column({ type: 'varchar', length: 32, default: '' })
  district!: string;

  /** 详细地址(街道 + 门牌) */
  @Column({ type: 'varchar', length: 256 })
  detail!: string;

  /** 是否默认地址(每个用户只能有 1 个) */
  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault!: boolean;
}
