import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum UploadKind {
  IMAGE = 'image',
}

export enum UploadStorage {
  LOCAL = 'local',
}

@Entity('upload_asset')
export class UploadAsset extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true, name: 'user_id' })
  userId!: string | null;

  @Column({ type: 'enum', enum: UploadKind, default: UploadKind.IMAGE })
  kind!: UploadKind;

  @Column({ type: 'enum', enum: UploadStorage, default: UploadStorage.LOCAL })
  storage!: UploadStorage;

  @Column({ type: 'varchar', length: 160 })
  filename!: string;

  @Column({ type: 'varchar', length: 255, name: 'original_name' })
  originalName!: string;

  @Column({ type: 'varchar', length: 80, name: 'mime_type' })
  mimeType!: string;

  @Column({ type: 'int', unsigned: true })
  size!: number;

  @Column({ type: 'varchar', length: 512 })
  path!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;
}
