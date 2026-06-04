import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { MessageType } from './message.entity';
import { MessageService } from './message.service';

describe('MessageService', () => {
  function createService(overrides: Record<string, any> = {}) {
    const repo = {
      create: jest.fn((input: any) => ({ id: 'msg_new', isRead: false, ...input })),
      save: jest.fn(async (input: any) => input),
      findAndCount: (jest.fn() as any).mockResolvedValue([[{ id: 'msg_1' }], 1]),
      count: (jest.fn() as any).mockResolvedValue(3),
      findOne: (jest.fn() as any).mockResolvedValue({
        id: 'msg_1',
        userId: 'user_1',
        isRead: false,
        readAt: null,
      }),
      update: (jest.fn() as any).mockResolvedValue({ affected: 2 }),
      ...overrides,
    };
    const service = new MessageService(repo as any);
    return { service, repo };
  }

  it('creates a notification with default empty content and related id', async () => {
    const { service, repo } = createService();

    const message = await service.notify({
      userId: 'user_1',
      type: MessageType.ORDER_PAID,
      title: 'Payment success',
    });

    expect(repo.create).toHaveBeenCalledWith({
      userId: 'user_1',
      type: MessageType.ORDER_PAID,
      title: 'Payment success',
      content: '',
      relatedId: '',
    });
    expect(repo.save).toHaveBeenCalled();
    expect(message?.id).toBe('msg_new');
  });

  it('returns null when notification persistence fails', async () => {
    const { service } = createService({
      save: (jest.fn() as any).mockRejectedValue(new Error('db down')),
    });
    const logSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

    try {
      const message = await service.notify({
        userId: 'user_1',
        type: MessageType.SYSTEM,
        title: 'System notice',
        content: 'hello',
        relatedId: 'rel_1',
      });

      expect(message).toBeNull();
      expect(logSpy).toHaveBeenCalledWith('notify failed: db down');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('lists messages with pagination and unread filter', async () => {
    const { service, repo } = createService();

    const page = await service.list('user_1', 2, 5, true);

    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { userId: 'user_1', isRead: false },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
    expect(repo.count).toHaveBeenCalledWith({ where: { userId: 'user_1', isRead: false } });
    expect(page).toEqual({
      items: [{ id: 'msg_1' }],
      total: 1,
      unreadCount: 3,
      page: 2,
      pageSize: 5,
    });
  });

  it('marks one unread message as read and rejects messages outside the user scope', async () => {
    const { service, repo } = createService();

    const message = await service.markRead('user_1', 'msg_1');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'msg_1', userId: 'user_1' } });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'msg_1', isRead: true, readAt: expect.any(Date) }),
    );
    expect(message.isRead).toBe(true);

    const missing = createService({ findOne: (jest.fn() as any).mockResolvedValue(null) });
    await expect(missing.service.markRead('user_1', 'msg_missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marks all unread messages for the current user', async () => {
    const { service, repo } = createService();

    const result = await service.markAllRead('user_1');

    expect(repo.update).toHaveBeenCalledWith(
      { userId: 'user_1', isRead: false },
      { isRead: true, readAt: expect.any(Date) },
    );
    expect(result).toEqual({ affected: 2 });
  });
});
