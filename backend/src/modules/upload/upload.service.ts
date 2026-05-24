import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import { UploadAsset, UploadKind, UploadStorage } from './upload-asset.entity';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(UploadAsset)
    private readonly assetRepo: Repository<UploadAsset>,
    private readonly config: ConfigService,
  ) {}

  async saveImage(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的图片');
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('图片不能超过 5MB');
    }
    const ext = ALLOWED_IMAGE_TYPES.get(file.mimetype);
    if (!ext) {
      throw new BadRequestException('仅支持 JPG/PNG/WEBP/GIF 图片');
    }

    const root = this.config.get<string>('storage.local.dir', './uploads');
    const baseUrl = this.config.get<string>(
      'storage.local.baseUrl',
      'http://127.0.0.1:3000/uploads',
    );
    const now = new Date();
    const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filename = `${ulid()}${extname(file.originalname) || ext}`;
    const dir = join(root, folder);
    const absolutePath = join(dir, filename);

    await mkdir(dir, { recursive: true });
    await writeFile(absolutePath, file.buffer);

    const publicPath = `${folder}/${filename}`.replace(/\\/g, '/');
    const url = `${baseUrl.replace(/\/$/, '')}/${publicPath}`;
    const asset = this.assetRepo.create({
      userId,
      kind: UploadKind.IMAGE,
      storage: UploadStorage.LOCAL,
      filename,
      originalName: file.originalname || filename,
      mimeType: file.mimetype,
      size: file.size,
      path: publicPath,
      url,
    });
    await this.assetRepo.save(asset);

    return {
      id: asset.id,
      url: asset.url,
      path: asset.path,
      filename: asset.filename,
      size: asset.size,
      mimeType: asset.mimeType,
    };
  }
}
