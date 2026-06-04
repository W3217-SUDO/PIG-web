import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { UserRole, UserStatus } from './user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  function createService(existingUser?: any) {
    const repo = {
      findOne: (jest.fn() as any).mockResolvedValue(existingUser ?? null),
      create: jest.fn((input: any) => ({ id: 'user_new', ...input })),
      save: jest.fn(async (input: any) => input),
      update: (jest.fn() as any).mockResolvedValue({ affected: 1 }),
    };
    const service = new UserService(repo as any);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    return { service, repo };
  }

  it('finds users by id and openid', async () => {
    const existing = { id: 'user_1', openid: 'openid_1' };
    const { service, repo } = createService(existing);

    await expect(service.findById('user_1')).resolves.toBe(existing);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'user_1' } });

    await expect(service.findByOpenid('openid_1')).resolves.toBe(existing);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { openid: 'openid_1' } });
  });

  it('creates a new active user by openid and updates last login', async () => {
    const { service, repo } = createService();

    const user = await service.findOrCreateByOpenid({
      openid: 'openid_new',
      unionid: 'union_1',
      nickname: 'New User',
      avatarUrl: 'avatar.jpg',
    });

    expect(repo.create).toHaveBeenCalledWith({
      openid: 'openid_new',
      unionid: 'union_1',
      nickname: 'New User',
      avatarUrl: 'avatar.jpg',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });
    expect(repo.save).toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith('user_new', { lastLoginAt: expect.any(Date) });
    expect(user.lastLoginAt).toBeInstanceOf(Date);
  });

  it('reuses an existing openid user without recreating it', async () => {
    const existing = {
      id: 'user_1',
      openid: 'openid_1',
      role: UserRole.USER,
      phone: null,
      lastLoginAt: null,
    };
    const { service, repo } = createService(existing);

    const user = await service.findOrCreateByOpenid({ openid: 'openid_1' });

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith('user_1', { lastLoginAt: expect.any(Date) });
    expect(user.id).toBe('user_1');
  });

  it('creates or repairs admin user and records last login', async () => {
    const created = createService();

    const admin = await created.service.findOrCreateAdmin('13800138000');

    expect(created.repo.create).toHaveBeenCalledWith({
      openid: 'admin_seed_001',
      unionid: null,
      phone: '13800138000',
      nickname: expect.any(String),
      avatarUrl: '',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    expect(admin.role).toBe(UserRole.ADMIN);

    const existingWrong = {
      id: 'admin_1',
      openid: 'admin_seed_001',
      role: UserRole.USER,
      phone: 'old',
      lastLoginAt: null,
    };
    const repaired = createService(existingWrong);
    const repairedAdmin = await repaired.service.findOrCreateAdmin('13800138000');

    expect(repaired.repo.update).toHaveBeenCalledWith('admin_1', {
      role: UserRole.ADMIN,
      phone: '13800138000',
    });
    expect(repaired.repo.update).toHaveBeenCalledWith('admin_1', {
      lastLoginAt: expect.any(Date),
    });
    expect(repairedAdmin.role).toBe(UserRole.ADMIN);
    expect(repairedAdmin.phone).toBe('13800138000');
  });

  it('updates profile fields and rejects missing users', async () => {
    const existing = {
      id: 'user_1',
      openid: 'openid_1',
      nickname: '',
      avatarUrl: '',
      phone: null,
    };
    const { service, repo } = createService(existing);

    const updated = await service.updateProfile('user_1', {
      nickname: 'Wang',
      avatarUrl: 'avatar.jpg',
      phone: '13800138000',
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nickname: 'Wang',
        avatarUrl: 'avatar.jpg',
        phone: '13800138000',
      }),
    );
    expect(updated.nickname).toBe('Wang');

    const missing = createService();
    await expect(missing.service.updateProfile('missing', { nickname: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
