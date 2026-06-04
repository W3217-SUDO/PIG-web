import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PigStatus } from './pig.entity';
import { PigService } from './pig.service';

describe('PigService', () => {
  const pig = {
    id: 'pig_1',
    merchantId: 'merchant_1',
    title: 'Black Soil Pig',
    description: 'Slow raised in mountain farm',
    breed: 'Black Soil Pig',
    farmerId: 'farmer_1',
    region: 'Guangyuan',
    weightKg: '80.00',
    expectedWeightKg: '150.00',
    mockVideoUrl: 'https://example.com/live.mp4',
    pricePerShare: '830.00',
    totalShares: 10,
    soldShares: 2,
    coverImage: 'https://example.com/pig.jpg',
    status: PigStatus.LISTED,
    listedAt: new Date('2026-01-01T00:00:00Z'),
  };
  const farmer = {
    id: 'farmer_1',
    name: 'Farmer Li',
    region: 'Guangyuan',
    avatarUrl: 'https://example.com/farmer.jpg',
    years: 12,
    story: 'Third generation farmer',
  };

  function createService(overrides: Record<string, any> = {}) {
    const pigRepo = {
      findAndCount: (jest.fn() as any).mockResolvedValue([[pig], 1]),
      findOne: (jest.fn() as any).mockResolvedValue(pig),
      ...overrides.pigRepo,
    };
    const farmerRepo = {
      find: (jest.fn() as any).mockResolvedValue([farmer]),
      findOne: (jest.fn() as any).mockResolvedValue(farmer),
      ...overrides.farmerRepo,
    };
    const feedRepo = {
      find: (jest.fn() as any).mockResolvedValue([
        {
          mealType: 'breakfast',
          checkedAt: new Date('2026-01-03T08:00:00Z'),
          foodDesc: 'Corn and pumpkin',
          imageUrl: 'feed.jpg',
        },
      ]),
      ...overrides.feedRepo,
    };
    const healthRepo = {
      find: (jest.fn() as any).mockResolvedValue([
        {
          recordType: 'vaccine',
          recordedAt: new Date('2026-01-02T08:00:00Z'),
          detail: 'Vaccine record',
          imageUrl: 'health.jpg',
        },
      ]),
      ...overrides.healthRepo,
    };
    const service = new PigService(pigRepo as any, farmerRepo as any, feedRepo as any, healthRepo as any);
    return { service, pigRepo, farmerRepo, feedRepo, healthRepo };
  }

  it('lists listed pigs with pagination, region filter, and farmer summary', async () => {
    const { service, pigRepo, farmerRepo } = createService();

    const result = await service.listPigs({ page: 2, pageSize: 5, region: 'Guangyuan' });

    expect(pigRepo.findAndCount).toHaveBeenCalledWith({
      where: { status: PigStatus.LISTED, region: 'Guangyuan' },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
    expect(farmerRepo.find).toHaveBeenCalledWith({ where: { id: expect.anything() } });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'pig_1',
          farmer: {
            id: 'farmer_1',
            name: 'Farmer Li',
            region: 'Guangyuan',
            avatarUrl: 'https://example.com/farmer.jpg',
          },
        }),
      ],
      total: 1,
      page: 2,
      pageSize: 5,
    });
  });

  it('returns detail with full farmer profile', async () => {
    const { service, pigRepo, farmerRepo } = createService();

    const detail = await service.getPigDetail('pig_1');

    expect(pigRepo.findOne).toHaveBeenCalledWith({ where: { id: 'pig_1' } });
    expect(farmerRepo.findOne).toHaveBeenCalledWith({ where: { id: 'farmer_1' } });
    expect(detail).toEqual(
      expect.objectContaining({
        id: 'pig_1',
        description: 'Slow raised in mountain farm',
        expectedWeightKg: '150.00',
        farmer: expect.objectContaining({
          years: 12,
          story: 'Third generation farmer',
        }),
      }),
    );
  });

  it('throws NotFoundException when detail pig does not exist', async () => {
    const { service } = createService({
      pigRepo: { findOne: (jest.fn() as any).mockResolvedValue(null) },
    });

    await expect(service.getPigDetail('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('merges feeding and health timeline events newest first', async () => {
    const { service, feedRepo, healthRepo } = createService();

    const events = await service.getPigTimeline('pig_1');

    expect(feedRepo.find).toHaveBeenCalledWith({
      where: { pigId: 'pig_1' },
      order: { checkedAt: 'DESC' },
      take: 50,
    });
    expect(healthRepo.find).toHaveBeenCalledWith({
      where: { pigId: 'pig_1' },
      order: { recordedAt: 'DESC' },
      take: 50,
    });
    expect(events).toEqual([
      {
        kind: 'feeding',
        at: '2026-01-03T08:00:00.000Z',
        title: expect.any(String),
        detail: 'Corn and pumpkin',
        imageUrl: 'feed.jpg',
      },
      {
        kind: 'health',
        at: '2026-01-02T08:00:00.000Z',
        title: expect.any(String),
        detail: 'Vaccine record',
        imageUrl: 'health.jpg',
      },
    ]);
  });
});
