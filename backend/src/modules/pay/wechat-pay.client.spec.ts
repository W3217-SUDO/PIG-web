import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildJsapiPayParams,
  decryptWechatPayResource,
  signWechatPayMessage,
  verifyWechatPaySignature,
} from './wechat-pay.client';

describe('wechat-pay client crypto helpers', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  function createKeyPair() {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    return { privateKey, publicKey };
  }

  it('signs and verifies WeChat Pay messages with RSA-SHA256', () => {
    const { privateKey, publicKey } = createKeyPair();
    const message = 'GET\n/v3/certificates\n1700000000\nnonce\n\n';

    const signature = signWechatPayMessage(message, privateKey);

    expect(verifyWechatPaySignature(message, signature, publicKey)).toBe(true);
    expect(verifyWechatPaySignature(`${message}tampered`, signature, publicKey)).toBe(false);
  });

  it('builds JSAPI payment params signed with package=prepay_id', () => {
    const { privateKey, publicKey } = createKeyPair();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000123);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.123456789);

    const params = buildJsapiPayParams({
      appid: 'wx_test',
      prepayId: 'wx_prepay_123',
      privateKey,
    });

    expect(params).toEqual(
      expect.objectContaining({
        appId: 'wx_test',
        timeStamp: '1700000000',
        nonceStr: expect.any(String),
        package: 'prepay_id=wx_prepay_123',
        signType: 'RSA',
        paySign: expect.any(String),
      }),
    );
    const message = `${params.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.package}\n`;
    expect(verifyWechatPaySignature(message, params.paySign, publicKey)).toBe(true);
  });

  it('decrypts WeChat Pay notification resources with API v3 key', () => {
    const apiV3Key = Buffer.from('12345678901234567890123456789012', 'utf8');
    const nonce = Buffer.from('nonce-1234567', 'utf8');
    const aad = Buffer.from('transaction');
    const plaintext = Buffer.from(JSON.stringify({ out_trade_no: 'PIG123', trade_state: 'SUCCESS' }));
    const { createCipheriv } = require('node:crypto') as typeof import('node:crypto');
    const cipher = createCipheriv('aes-256-gcm', apiV3Key, nonce);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    const result = decryptWechatPayResource({
      apiV3Key: apiV3Key.toString('utf8'),
      nonce: nonce.toString('utf8'),
      associatedData: aad.toString('utf8'),
      ciphertext: Buffer.concat([ciphertext, tag]).toString('base64'),
    });

    expect(result).toEqual({ out_trade_no: 'PIG123', trade_state: 'SUCCESS' });
  });
});
