import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';

export interface FindOrCreateInput {
  openid: string;
  unionid?: string | null;
  nickname?: string;
  avatarUrl?: string;
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
}
