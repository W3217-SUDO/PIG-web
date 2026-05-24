import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ShareInvite } from './share-invite.entity';
import { ShareMember, ShareMemberRole } from './share-member.entity';
import { Order } from '../order/order.entity';
import { Pig } from '../pig/pig.entity';
import { User } from '../user/user.entity';

const TTL_DAYS = 30;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 IO01 易混

function randomCode(len = 8): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(ShareInvite)
    private readonly inviteRepo: Repository<ShareInvite>,
    @InjectRepository(ShareMember)
    private readonly memberRepo: Repository<ShareMember>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Pig) private readonly pigRepo: Repository<Pig>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 主认领人生成邀请码(同一订单有未过期 code 则复用,不生成新码)
   */
  async createInvite(userId: string, orderId: string): Promise<ShareInvite> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== 'paid') {
      throw new BadRequestException('订单未支付,无法发起拼猪');
    }
    // 复用未过期 code
    const now = new Date();
    const existing = await this.inviteRepo
      .createQueryBuilder('s')
      .where('s.order_id = :oid', { oid: orderId })
      .andWhere('s.expires_at > :now', { now })
      .getOne();
    if (existing) return existing;

    // 生成新 code(碰撞重试 5 次)
    let code = '';
    for (let i = 0; i < 5; i++) {
      code = randomCode();
      const dup = await this.inviteRepo.findOne({ where: { code } });
      if (!dup) break;
      code = '';
    }
    if (!code) throw new Error('无法生成唯一短码,请重试');

    const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 3600 * 1000);
    const invite = this.inviteRepo.create({
      code,
      orderId,
      userId,
      expiresAt,
    });
    const saved = await this.inviteRepo.save(invite);
    await this.ensureMember(saved.id, userId, ShareMemberRole.HOST);
    return saved;
  }

  /**
   * 受邀人凭 code 查看简版信息(@Public, 不强求登录)
   * 返回:订单概要 + 猪 + 主认领人昵称;不含联系方式 / 钱包等敏感
   */
  async lookup(code: string) {
    const invite = await this.inviteRepo.findOne({ where: { code } });
    if (!invite) throw new NotFoundException('邀请不存在或已过期');
    if (invite.expiresAt < new Date()) {
      throw new ForbiddenException('邀请已过期');
    }
    const [order, host] = await Promise.all([
      this.orderRepo.findOne({ where: { id: invite.orderId } }),
      this.userRepo.findOne({ where: { id: invite.userId } }),
    ]);
    if (!order) throw new NotFoundException('订单不存在');
    const pig = await this.pigRepo.findOne({ where: { id: order.pigId } });
    return {
      code,
      expiresAt: invite.expiresAt,
      host: host ? { nickname: host.nickname || '主认领人', avatarUrl: host.avatarUrl } : null,
      order: {
        sharesCount: order.sharesCount,
        totalPrice: order.totalPrice,
        status: order.status,
      },
      pig: pig
        ? {
            id: pig.id,
            title: pig.title,
            breed: pig.breed,
            region: pig.region,
            coverImage: pig.coverImage,
            description: pig.description,
            totalShares: pig.totalShares,
            soldShares: pig.soldShares,
            pricePerShare: pig.pricePerShare,
          }
        : null,
    };
  }

  async join(code: string, userId: string) {
    const invite = await this.getValidInvite(code);
    const member = await this.ensureMember(invite.id, userId, ShareMemberRole.MEMBER);
    return {
      code,
      joined: true,
      member: {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
      },
    };
  }

  async members(code: string, userId: string) {
    const invite = await this.getValidInvite(code);
    const canView =
      invite.userId === userId ||
      !!(await this.memberRepo.findOne({ where: { inviteId: invite.id, userId } }));
    if (!canView) throw new ForbiddenException('无权查看拼猪成员');

    await this.ensureMember(invite.id, invite.userId, ShareMemberRole.HOST);
    const members = await this.memberRepo.find({
      where: { inviteId: invite.id },
      order: { createdAt: 'ASC' },
    });
    const users = members.length
      ? await this.userRepo.find({ where: { id: In(members.map((m) => m.userId)) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      code,
      total: members.length,
      members: members.map((m) => {
        const u = userMap.get(m.userId);
        return {
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          nickname: u?.nickname || (m.role === ShareMemberRole.HOST ? '主认领人' : '拼猪成员'),
          avatarUrl: u?.avatarUrl || '',
        };
      }),
    };
  }

  private async getValidInvite(code: string) {
    const invite = await this.inviteRepo.findOne({ where: { code } });
    if (!invite) throw new NotFoundException('邀请不存在或已过期');
    if (invite.expiresAt < new Date()) throw new ForbiddenException('邀请已过期');
    return invite;
  }

  private async ensureMember(inviteId: string, userId: string, role: ShareMemberRole) {
    const existing = await this.memberRepo.findOne({ where: { inviteId, userId } });
    if (existing) {
      if (role === ShareMemberRole.HOST && existing.role !== ShareMemberRole.HOST) {
        existing.role = ShareMemberRole.HOST;
        return this.memberRepo.save(existing);
      }
      return existing;
    }
    const member = this.memberRepo.create({
      inviteId,
      userId,
      role,
      joinedAt: new Date(),
    });
    return this.memberRepo.save(member);
  }
}
