import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';
import { WechatPhoneService } from './wechat-phone.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WechatPhoneService', () => {
  function createService() {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'wx.mp.appid') return 'wx_appid';
        if (key === 'wx.mp.secret') return 'wx_secret';
        return undefined;
      }),
    } as unknown as ConfigService;
    return new WechatPhoneService(config);
  }

  it('exchanges phone code through WeChat API', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { access_token: 'token_1', expires_in: 7200 } });
    mockedAxios.post.mockResolvedValueOnce({
      data: { phone_info: { phoneNumber: '13800138000' } },
    });

    const service = createService();

    await expect(service.getPhoneNumber('phone_code')).resolves.toBe('13800138000');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.weixin.qq.com/cgi-bin/token',
      expect.objectContaining({
        params: { grant_type: 'client_credential', appid: 'wx_appid', secret: 'wx_secret' },
      }),
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=token_1',
      { code: 'phone_code' },
      expect.any(Object),
    );
  });

  it('rejects WeChat phone API errors', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { access_token: 'token_1', expires_in: 7200 } });
    mockedAxios.post.mockResolvedValueOnce({ data: { errcode: 40029, errmsg: 'invalid code' } });

    await expect(createService().getPhoneNumber('bad')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
