import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShareInvite } from './share-invite.entity';
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
    return this.inviteRepo.save(invite);
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
}
