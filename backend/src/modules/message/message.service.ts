import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageType } from './message.entity';

export interface NotifyInput {
  userId: string;
  type: MessageType;
  title: string;
  content?: string;
  relatedId?: string;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message) private readonly repo: Repository<Message>,
  ) {}

  /** 写一条站内消息(失败仅 log,不抛出影响主流程) */
  async notify(input: NotifyInput): Promise<Message | null> {
    try {
      const m = this.repo.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        content: input.content ?? '',
        relatedId: input.relatedId ?? '',
      });
      return await this.repo.save(m);
    } catch (e) {
      this.logger.error(`notify failed: ${(e as Error).message}`);
      return null;
    }
  }

  async list(
    userId: string,
    page = 1,
    pageSize = 20,
    onlyUnread = false,
  ) {
    const where: Record<string, unknown> = { userId };
    if (onlyUnread) where.isRead = false;
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const unreadCount = await this.repo.count({ where: { userId, isRead: false } });
    return { items, total, unreadCount, page, pageSize };
  }

  async markRead(userId: string, id: string) {
    const m = await this.repo.findOne({ where: { id, userId } });
    if (!m) throw new NotFoundException('消息不存在');
    if (!m.isRead) {
      m.isRead = true;
      m.readAt = new Date();
      await this.repo.save(m);
    }
    return m;
  }

  async markAllRead(userId: string) {
    const r = await this.repo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { affected: r.affected || 0 };
  }
}
