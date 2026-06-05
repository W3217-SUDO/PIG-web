import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface WxAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WxPhoneResponse {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  };
}

@Injectable()
export class WechatPhoneService {
  private accessToken = '';
  private accessTokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  async getPhoneNumber(code: string): Promise<string> {
    const token = await this.getAccessToken();
    const { data } = await axios.post<WxPhoneResponse>(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token)}`,
      { code },
      { timeout: 5000 },
    );

    if (data.errcode || !data.phone_info?.phoneNumber) {
      throw new BadGatewayException(`wechat phone fail: ${data.errmsg || 'no phone'}`);
    }
    return data.phone_info.phoneNumber;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessTokenExpiresAt > now + 60_000) {
      return this.accessToken;
    }

    const appid = this.config.get<string>('wx.mp.appid');
    const secret = this.config.get<string>('wx.mp.secret');
    if (!appid || !secret) {
      throw new BadGatewayException('wechat appid/secret not configured');
    }

    const { data } = await axios.get<WxAccessTokenResponse>(
      'https://api.weixin.qq.com/cgi-bin/token',
      {
        params: { grant_type: 'client_credential', appid, secret },
        timeout: 5000,
      },
    );

    if (data.errcode || !data.access_token) {
      throw new BadGatewayException(`wechat token fail: ${data.errmsg || 'no access_token'}`);
    }

    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = now + Math.max((data.expires_in ?? 7200) - 300, 60) * 1000;
    return this.accessToken;
  }
}
