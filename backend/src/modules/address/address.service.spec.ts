import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AddressService } from './address.service';

describe('AddressService', () => {
  const address = {
    id: 'addr_1',
    userId: 'user_1',
    name: 'Alice',
    phone: '13800138000',
    province: 'Sichuan',
    city: 'Chengdu',
    district: 'Wuhou',
    detail: 'No.1 Yard',
    isDefault: false,
  };

  function createService(overrides: Record<string, any> = {}) {
    const repo = {
      find: (jest.fn() as any).mockResolvedValue([address]),
      findOne: (jest.fn() as any).mockResolvedValue({ ...address }),
      count: (jest.fn() as any).mockResolvedValue(1),
      create: jest.fn((input: any) => ({ id: 'addr_new', ...input })),
      save: jest.fn(async (input: any) => input),
      update: (jest.fn() as any).mockResolvedValue({ affected: 1 }),
      remove: (jest.fn() as any).mockResolvedValue(address),
      ...overrides,
    };
    const service = new AddressService(repo as any);
    return { service, repo };
  }

  it('lists current user addresses with default first', async () => {
    const { service, repo } = createService();

    const items = await service.list('user_1');

    expect(repo.find).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    expect(items).toEqual([address]);
  });

  it('creates the first address as default', async () => {
    const { service, repo } = createService({
      count: (jest.fn() as any).mockResolvedValue(0),
    });

    const created = await service.create('user_1', {
      name: 'Alice',
      phone: '13800138000',
      province: 'Sichuan',
      city: 'Chengdu',
      district: 'Wuhou',
      detail: 'No.1 Yard',
    } as any);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_1', isDefault: true }),
    );
    expect(created.isDefault).toBe(true);
  });

  it('clears previous default when creating or updating a default address', async () => {
    const { service, repo } = createService();

    await service.create('user_1', {
      name: 'Bob',
      phone: '13800138001',
      province: 'Sichuan',
      city: 'Chengdu',
      district: 'Jinjiang',
      detail: 'No.2 Yard',
      isDefault: true,
    } as any);

    expect(repo.update).toHaveBeenCalledWith(
      { userId: 'user_1', isDefault: true },
      { isDefault: false },
    );

    await service.update('user_1', 'addr_1', { isDefault: true } as any);

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true }));
  });

  it('rejects updating a missing address', async () => {
    const { service } = createService({
      findOne: (jest.fn() as any).mockResolvedValue(null),
    });

    await expect(service.update('user_1', 'missing', { name: 'x' } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes an address and promotes latest address after deleting the default', async () => {
    const next = { ...address, id: 'addr_2', isDefault: false };
    const { service, repo } = createService({
      findOne: (jest.fn() as any)
        .mockResolvedValueOnce({ ...address, isDefault: true })
        .mockResolvedValueOnce(next),
    });

    const result = await service.remove('user_1', 'addr_1');

    expect(repo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'addr_1' }));
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      order: { createdAt: 'DESC' },
    });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'addr_2', isDefault: true }));
    expect(result).toEqual({ id: 'addr_1' });
  });
});
