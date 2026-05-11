import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import type { JwtPayload } from './jwt.strategy';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: string;
}

interface WxJsCode2SessionResponse {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 签发 access + refresh token。
   * access  → jwt.accessExpiresIn (默认 2h)
   * refresh → jwt.refreshExpiresIn (默认 7d)
   */
  signTokens(user: User): TokenPair {
    const payload: JwtPayload = { sub: user.id, openid: user.openid, role: user.role };
    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn', '2h');
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn', '7d');
    const access_token = this.jwtService.sign(payload, { expiresIn: accessExpiresIn });
    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: refreshExpiresIn },
    );
    return { access_token, refresh_token, token_type: 'Bearer', expires_in: accessExpiresIn };
  }

  /**
   * 微信小程序登录:
   * 1) 拿 code 调 jscode2session → openid + unionid
   * 2) findOrCreate User
   * 3) signTokens
   *
   * 本地占位 appid/secret 时, 微信会回 errcode != 0, 这里抛 502。
   */
  async wxLogin(input: {
    code: string;
    nickname?: string;
    avatarUrl?: string;
  }): Promise<{ user: User; tokens: TokenPair }> {
    const appid = this.config.get<string>('wx.mp.appid');
    const secret = this.config.get<string>('wx.mp.secret');
    if (!appid || !secret || appid.startsWith('wx_dev_') || appid === 'wx_placeholder_appid') {
      throw new BadGatewayException(
        '微信 appid/secret 未配置(本地占位)。开发请用 /api/auth/dev-login',
      );
    }

    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const { data } = await axios.get<WxJsCode2SessionResponse>(url, {
      params: { appid, secret, js_code: input.code, grant_type: 'authorization_code' },
      timeout: 5000,
    });

    if (data.errcode || !data.openid) {
      this.logger.warn(`jscode2session failed: ${JSON.stringify(data)}`);
      throw new BadGatewayException(`wx login fail: ${data.errmsg || 'no openid'}`);
    }

    const user = await this.userService.findOrCreateByOpenid({
      openid: data.openid,
      unionid: data.unionid ?? null,
      nickname: input.nickname,
      avatarUrl: input.avatarUrl,
    });
    return { user, tokens: this.signTokens(user) };
  }

  /**
   * 开发旁路: 直接用一个 openid 登录, 不走微信。
   * 仅在 NODE_ENV !== production 暴露 (controller 层做守卫)。
   */
  async devLogin(openid = 'dev_user_001'): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.userService.findOrCreateByOpenid({
      openid,
      nickname: `dev-${openid}`,
    });
    return { user, tokens: this.signTokens(user) };
  }
}
