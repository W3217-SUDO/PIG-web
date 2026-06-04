import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PigStatus } from '../pig/pig.entity';
import { FarmerService } from './farmer.service';

describe('FarmerService', () => {
  function createService(overrides: Record<string, any> = {}) {
    const farmer = {
      id: 'farmer_1',
      name: 'Farmer Li',
      region: 'Guangyuan',
      years: 12,
      avatarUrl: 'farmer.jpg',
      story: 'Third generation farmer',
      videoUrl: 'farmer.mp4',
    };
    const pig = { id: 'pig_1', farmerId: 'farmer_1', status: PigStatus.LISTED };
    const farmerRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(farmer),
      ...overrides.farmerRepo,
    };
    const pigRepo = {
      count: (jest.fn() as any).mockResolvedValueOnce(2).mockResolvedValueOnce(5),
      find: (jest.fn() as any).mockResolvedValue([pig]),
      ...overrides.pigRepo,
    };
    const service = new FarmerService(farmerRepo as any, pigRepo as any);
    return { service, farmerRepo, pigRepo };
  }

  it('returns farmer detail with listed and total pig counts', async () => {
    const { service, pigRepo } = createService();

    const detail = await service.getFarmer('farmer_1');

    expect(pigRepo.count).toHaveBeenCalledWith({
      where: { farmerId: 'farmer_1', status: PigStatus.LISTED },
    });
    expect(pigRepo.count).toHaveBeenCalledWith({ where: { farmerId: 'farmer_1' } });
    expect(detail).toEqual(
      expect.objectContaining({
        id: 'farmer_1',
        listingPigsCount: 2,
        totalPigsCount: 5,
      }),
    );
  });

  it('rejects missing farmers', async () => {
    const { service } = createService({
      farmerRepo: { findOne: (jest.fn() as any).mockResolvedValue(null) },
    });

    await expect(service.getFarmer('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists farmer pigs with listed-only default and optional all flag', async () => {
    const { service, pigRepo } = createService();

    await service.getFarmerPigs('farmer_1');
    expect(pigRepo.find).toHaveBeenCalledWith({
      where: { farmerId: 'farmer_1', status: PigStatus.LISTED },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    await service.getFarmerPigs('farmer_1', true);
    expect(pigRepo.find).toHaveBeenCalledWith({
      where: { farmerId: 'farmer_1' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  });
});
