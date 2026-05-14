import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';

export interface FindOrCreateInput {
  openid: string;
  unionid?: string | null;
  nickname?: string;
  avatarUrl?: string;
}

export interface UpdateProfileInput {
  nickname?: string;
  avatarUrl?: string;
  phone?: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByOpenid(openid: string): Promise<User | null> {
    return this.repo.findOne({ where: { openid } });
  }

  /**
   * 微信登录核心: 用 openid 查, 没有则建一个新用户。
   * 同时更新 last_login_at(用 UPDATE 而不是 save 减开销)。
   */
  async findOrCreateByOpenid(input: FindOrCreateInput): Promise<User> {
    let user = await this.findByOpenid(input.openid);
    if (!user) {
      user = this.repo.create({
        openid: input.openid,
        unionid: input.unionid ?? null,
        nickname: input.nickname ?? '',
        avatarUrl: input.avatarUrl ?? '',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      user = await this.repo.save(user);
      this.logger.log(`new user: id=${user.id} openid=${user.openid}`);
    }
    await this.repo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    return user;
  }

  /**
   * 管理员账号 findOrCreate:固定 openid='admin_seed_001',强制 role=ADMIN。
   * adminLogin 用,凭据校验已在上游完成。
   */
  async findOrCreateAdmin(phone: string): Promise<User> {
    const SEED_OPENID = 'admin_seed_001';
    let user = await this.findByOpenid(SEED_OPENID);
    if (!user) {
      user = this.repo.create({
        openid: SEED_OPENID,
        unionid: null,
        phone,
        nickname: '管理员',
        avatarUrl: '',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      user = await this.repo.save(user);
      this.logger.log(`new admin user: id=${user.id} phone=${phone}`);
    } else if (user.role !== UserRole.ADMIN || user.phone !== phone) {
      // 已存在但 role/phone 不对(可能被改过) → 强制矫正
      await this.repo.update(user.id, { role: UserRole.ADMIN, phone });
      user.role = UserRole.ADMIN;
      user.phone = phone;
    }
    await this.repo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    return user;
  }

  /**
   * 更新用户资料(部分字段)
   */
  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`user ${id} not found`);
    if (input.nickname !== undefined) user.nickname = input.nickname;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    if (input.phone !== undefined) user.phone = input.phone;
    return this.repo.save(user);
  }
}
