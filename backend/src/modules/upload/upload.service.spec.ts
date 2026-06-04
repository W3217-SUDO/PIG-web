import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { mkdir, writeFile } from 'fs/promises';
import { UploadKind, UploadStorage } from './upload-asset.entity';
import { UploadService } from './upload.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(async () => undefined),
  writeFile: jest.fn(async () => undefined),
}));

describe('UploadService', () => {
  const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
  const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createService(overrides: Record<string, any> = {}) {
    const assetRepo = {
      create: jest.fn((input: any) => ({ id: 'asset_1', ...input })),
      save: jest.fn(async (input: any) => input),
      ...overrides.assetRepo,
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'storage.local.dir') return 'C:/tmp/pig-uploads';
        if (key === 'storage.local.baseUrl') return 'https://cdn.example.com/uploads/';
        return fallback;
      }),
      ...overrides.config,
    };
    const service = new UploadService(assetRepo as any, config as ConfigService);
    return { service, assetRepo, config };
  }

  function makeFile(overrides: Partial<Express.Multer.File> = {}) {
    return {
      originalname: 'farm-photo.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('image-bytes'),
      ...overrides,
    } as Express.Multer.File;
  }

  it('rejects missing files, oversized files, and unsupported image types', async () => {
    const { service } = createService();

    await expect(service.saveImage('user_1', undefined as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.saveImage('user_1', makeFile({ size: 5 * 1024 * 1024 + 1 })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveImage('user_1', makeFile({ mimetype: 'text/plain', originalname: 'note.txt' })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockedMkdir).not.toHaveBeenCalled();
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('writes valid images locally and persists asset metadata', async () => {
    const { service, assetRepo, config } = createService();

    const result = await service.saveImage('user_1', makeFile());

    expect(config.get).toHaveBeenCalledWith('storage.local.dir', './uploads');
    expect(config.get).toHaveBeenCalledWith(
      'storage.local.baseUrl',
      'http://127.0.0.1:3000/uploads',
    );
    expect(mockedMkdir).toHaveBeenCalledWith(expect.stringContaining('pig-uploads'), {
      recursive: true,
    });
    expect(mockedWriteFile).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), Buffer.from('image-bytes'));
    expect(assetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        kind: UploadKind.IMAGE,
        storage: UploadStorage.LOCAL,
        originalName: 'farm-photo.png',
        mimeType: 'image/png',
        size: 1024,
        filename: expect.stringMatching(/\.png$/),
        path: expect.stringMatching(/^\d{4}-\d{2}\/.*\.png$/),
        url: expect.stringMatching(/^https:\/\/cdn\.example\.com\/uploads\/\d{4}-\d{2}\/.*\.png$/),
      }),
    );
    expect(assetRepo.save).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 'asset_1',
        url: expect.stringContaining('https://cdn.example.com/uploads/'),
        mimeType: 'image/png',
      }),
    );
  });

  it('falls back to the mimetype extension when original name has no extension', async () => {
    const { service, assetRepo } = createService();

    await service.saveImage(null as any, makeFile({ originalname: 'upload', mimetype: 'image/webp' }));

    expect(assetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        filename: expect.stringMatching(/\.webp$/),
        originalName: 'upload',
        mimeType: 'image/webp',
      }),
    );
  });
});
