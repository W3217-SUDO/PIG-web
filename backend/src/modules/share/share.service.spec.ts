import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { OrderStatus } from '../order/order.entity';
import { PigStatus } from '../pig/pig.entity';
import { ShareInvite } from './share-invite.entity';
import { ShareMemberRole } from './share-member.entity';
import { ShareService } from './share.service';

describe('ShareService', () => {
  const hostId = 'user_host';
  const memberId = 'user_member';
  const inviteCode = 'ABCDEFGH';

  function makeInvite(overrides: Partial<ShareInvite> = {}) {
    return {
      id: 'invite_1',
      code: inviteCode,
      orderId: 'order_1',
      userId: hostId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      ...overrides,
    } as ShareInvite;
  }

  function createService(overrides: Record<string, any> = {}) {
    const order = overrides.order ?? {
      id: 'order_1',
      userId: hostId,
      pigId: 'pig_1',
      status: OrderStatus.PAID,
      sharesCount: 3,
      totalPrice: '264.00',
    };
    const pig = overrides.pig ?? {
      id: 'pig_1',
      title: 'Launch Pig',
      breed: 'Local Pig',
      region: 'Guangyuan',
      coverImage: 'pig.jpg',
      description: 'Slow raised',
      totalShares: 10,
      soldShares: 3,
      pricePerShare: '88.00',
      status: PigStatus.LISTED,
    };
    const host = overrides.host ?? { id: hostId, nickname: 'Host', avatarUrl: 'host.jpg' };
    const invite = overrides.invite ?? makeInvite();
    const member = overrides.member ?? {
      id: 'member_1',
      inviteId: invite.id,
      userId: memberId,
      role: ShareMemberRole.MEMBER,
      joinedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const hostMember = {
      id: 'member_host',
      inviteId: invite.id,
      userId: hostId,
      role: ShareMemberRole.HOST,
      joinedAt: new Date('2026-01-01T00:00:00Z'),
    };

    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: (jest.fn() as any).mockResolvedValue(overrides.existingInvite ?? null),
    };
    const inviteRepo = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      findOne: (jest.fn() as any).mockResolvedValue(invite),
      create: jest.fn((input: any) => ({ id: 'invite_new', ...input })),
      save: jest.fn(async (input: any) => input),
      ...overrides.inviteRepo,
    };
    const memberRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(null),
      create: jest.fn((input: any) => ({ id: 'member_new', ...input })),
      save: jest.fn(async (input: any) => input),
      find: (jest.fn() as any).mockResolvedValue([hostMember, member]),
      ...overrides.memberRepo,
    };
    const orderRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(order),
      ...overrides.orderRepo,
    };
    const pigRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(pig),
      ...overrides.pigRepo,
    };
    const userRepo = {
      findOne: (jest.fn() as any).mockResolvedValue(host),
      find: (jest.fn() as any).mockResolvedValue([
        host,
        { id: memberId, nickname: 'Member', avatarUrl: 'member.jpg' },
      ]),
      ...overrides.userRepo,
    };

    const service = new ShareService(
      inviteRepo as any,
      memberRepo as any,
      orderRepo as any,
      pigRepo as any,
      userRepo as any,
    );

    return {
      service,
      invite,
      inviteRepo,
      memberRepo,
      orderRepo,
      pigRepo,
      userRepo,
      queryBuilder,
    };
  }

  it('reuses an unexpired invite for a paid order owned by the host', async () => {
    const existingInvite = makeInvite({ id: 'invite_existing' });
    const { service, inviteRepo, memberRepo } = createService({ existingInvite });

    const invite = await service.createInvite(hostId, 'order_1');

    expect(invite).toBe(existingInvite);
    expect(inviteRepo.create).not.toHaveBeenCalled();
    expect(memberRepo.create).not.toHaveBeenCalled();
  });

  it('creates a new invite and host member when no valid invite exists', async () => {
    const { service, inviteRepo, memberRepo } = createService({
      inviteRepo: {
        findOne: (jest.fn() as any).mockResolvedValue(null),
      },
    });

    const invite = await service.createInvite(hostId, 'order_1');

    expect(inviteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order_1', userId: hostId, code: expect.any(String) }),
    );
    expect(memberRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ inviteId: 'invite_new', userId: hostId, role: ShareMemberRole.HOST }),
    );
    expect(invite.id).toBe('invite_new');
  });

  it('rejects invite creation for non-owned or unpaid orders', async () => {
    await expect(
      createService({ order: { id: 'order_1', userId: 'other', status: OrderStatus.PAID } }).service.createInvite(
        hostId,
        'order_1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      createService({ order: { id: 'order_1', userId: hostId, status: OrderStatus.PENDING } }).service.createInvite(
        hostId,
        'order_1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('looks up a valid invite with public order and pig summary', async () => {
    const { service, orderRepo, userRepo, pigRepo } = createService();

    const result = await service.lookup(inviteCode);

    expect(orderRepo.findOne).toHaveBeenCalledWith({ where: { id: 'order_1' } });
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: hostId } });
    expect(pigRepo.findOne).toHaveBeenCalledWith({ where: { id: 'pig_1' } });
    expect(result).toEqual(
      expect.objectContaining({
        code: inviteCode,
        host: { nickname: 'Host', avatarUrl: 'host.jpg' },
        order: { sharesCount: 3, totalPrice: '264.00', status: OrderStatus.PAID },
        pig: expect.objectContaining({ id: 'pig_1', title: 'Launch Pig' }),
      }),
    );
  });

  it('rejects missing and expired invite lookups', async () => {
    await expect(
      createService({ inviteRepo: { findOne: (jest.fn() as any).mockResolvedValue(null) } }).service.lookup(
        inviteCode,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      createService({ invite: makeInvite({ expiresAt: new Date(Date.now() - 1000) }) }).service.lookup(inviteCode),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('joins a valid invite idempotently through ensureMember', async () => {
    const existing = {
      id: 'member_existing',
      inviteId: 'invite_1',
      userId: memberId,
      role: ShareMemberRole.MEMBER,
      joinedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const { service, memberRepo } = createService({
      memberRepo: {
        findOne: (jest.fn() as any).mockResolvedValue(existing),
      },
    });

    const result = await service.join(inviteCode, memberId);

    expect(memberRepo.create).not.toHaveBeenCalled();
    expect(result.member.id).toBe('member_existing');
    expect(result.joined).toBe(true);
  });

  it('lists members for host or joined users and blocks strangers', async () => {
    const { service, memberRepo, userRepo } = createService({
      memberRepo: {
        findOne: (jest.fn() as any).mockResolvedValue({ id: 'member_host' }),
      },
    });

    const result = await service.members(inviteCode, hostId);

    expect(memberRepo.find).toHaveBeenCalledWith({
      where: { inviteId: 'invite_1' },
      order: { createdAt: 'ASC' },
    });
    expect(userRepo.find).toHaveBeenCalled();
    expect(result.total).toBe(2);
    expect(result.members[0]).toEqual(
      expect.objectContaining({ userId: hostId, role: ShareMemberRole.HOST, nickname: 'Host' }),
    );

    await expect(createService().service.members(inviteCode, 'stranger')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
