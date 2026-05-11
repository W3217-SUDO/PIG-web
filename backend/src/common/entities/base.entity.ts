import { BeforeInsert, CreateDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ulid } from 'ulid';

/**
 * 所有业务表的公共基类:
 * - 主键 id: CHAR(26) ULID, 在 @BeforeInsert 自动填充(若未手动设置)
 * - created_at / updated_at: DATETIME(3) 自动维护
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id!: string;

  @CreateDateColumn({ type: 'datetime', precision: 6, name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6, name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  protected fillId(): void {
    if (!this.id) this.id = ulid();
  }
}
