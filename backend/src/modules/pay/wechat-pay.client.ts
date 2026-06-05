import { createDecipheriv, createSign, createVerify, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

export interface WechatPayConfig {
  appid: string;
  mchid: string;
  apiV3Key: string;
  certificateSerialNo: string;
  privateKey: string;
  platformCertificate: string;
  notifyUrl: string;
}

export interface JsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

export interface WxPrepayRequest {
  description: string;
  outTradeNo: string;
  amountTotal: number;
  openid: string;
  attach?: string;
  clientIp?: string;
}

export interface WechatPayNotificationResource {
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}

export interface WechatPayNotification {
  id?: string;
  create_time?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  resource?: WechatPayNotificationResource;
}

export function signWechatPayMessage(message: string, privateKey: string) {
  return createSign('RSA-SHA256').update(message, 'utf8').sign(privateKey, 'base64');
}

export function verifyWechatPaySignature(message: string, signature: string, publicKey: string) {
  try {
    return createVerify('RSA-SHA256').update(message, 'utf8').verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
}

export function buildJsapiPayParams(input: {
  appid: string;
  prepayId: string;
  privateKey: string;
}): JsapiPayParams {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomBytes(16).toString('hex');
  const pkg = `prepay_id=${input.prepayId}`;
  const message = `${input.appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;

  return {
    appId: input.appid,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: signWechatPayMessage(message, input.privateKey),
  };
}

export function decryptWechatPayResource(input: {
  apiV3Key: string;
  nonce: string;
  associatedData?: string;
  ciphertext: string;
}) {
  const payload = Buffer.from(input.ciphertext, 'base64');
  const authTag = payload.subarray(payload.length - 16);
  const encrypted = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(input.apiV3Key, 'utf8'), input.nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(input.associatedData || '', 'utf8'));
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext);
}

export function loadWechatPayConfigFromEnv(): WechatPayConfig | null {
  const appid = process.env.WX_PAY_APPID || process.env.WX_MP_APPID || process.env.WECHAT_APPID || '';
  const mchid = process.env.WX_PAY_MCH_ID || process.env.PAY_MCHID || '';
  const apiV3Key = process.env.WX_PAY_API_V3_KEY || process.env.PAY_KEY_V3 || '';
  const certificateSerialNo = process.env.WX_PAY_CERT_SERIAL_NO || process.env.PAY_SERIAL || '';
  const privateKeyPath = process.env.WX_PAY_PRIVATE_KEY_PATH || process.env.PAY_KEY_PATH || '';
  const platformCertPath =
    process.env.WX_PAY_PLATFORM_CERT_PATH || process.env.PAY_PLATFORM_CERT_PATH || '';
  const notifyUrl =
    process.env.WX_PAY_NOTIFY_URL || 'https://www.rockingwei.online/api/pay/wx-notify';

  if (!appid || !mchid || !apiV3Key || !certificateSerialNo || !privateKeyPath || !platformCertPath) {
    return null;
  }

  return {
    appid,
    mchid,
    apiV3Key,
    certificateSerialNo,
    privateKey: readFileSync(privateKeyPath, 'utf8'),
    platformCertificate: readFileSync(platformCertPath, 'utf8'),
    notifyUrl,
  };
}

export class WechatPayClient {
  constructor(private readonly config: WechatPayConfig) {}

  getConfig() {
    return this.config;
  }

  async createJsapiPrepay(input: WxPrepayRequest) {
    const path = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify({
      appid: this.config.appid,
      mchid: this.config.mchid,
      description: input.description.slice(0, 127),
      out_trade_no: input.outTradeNo,
      attach: input.attach,
      notify_url: this.config.notifyUrl,
      amount: {
        total: input.amountTotal,
        currency: 'CNY',
      },
      payer: {
        openid: input.openid,
      },
      scene_info: input.clientIp ? { payer_client_ip: input.clientIp } : undefined,
    });

    const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.buildAuthorization('POST', path, body),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) {
      const code = json.code || `HTTP_${response.status}`;
      const message = json.message || response.statusText || 'WeChat Pay request failed';
      throw new Error(`WECHAT_PAY_PREPAY_FAILED:${code}:${message}`);
    }
    if (!json.prepay_id) {
      throw new Error('WECHAT_PAY_PREPAY_FAILED:MISSING_PREPAY_ID');
    }

    return {
      prepayId: json.prepay_id as string,
      payParams: buildJsapiPayParams({
        appid: this.config.appid,
        prepayId: json.prepay_id as string,
        privateKey: this.config.privateKey,
      }),
    };
  }

  buildAuthorization(method: string, path: string, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = signWechatPayMessage(message, this.config.privateKey);
    return [
      'WECHATPAY2-SHA256-RSA2048',
      `mchid="${this.config.mchid}"`,
      `nonce_str="${nonce}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.config.certificateSerialNo}"`,
    ].join(' ');
  }

  verifyNotificationSignature(input: {
    timestamp: string;
    nonce: string;
    body: string;
    signature: string;
  }) {
    const message = `${input.timestamp}\n${input.nonce}\n${input.body}\n`;
    return verifyWechatPaySignature(message, input.signature, this.config.platformCertificate);
  }

  decryptNotification(notification: WechatPayNotification) {
    if (!notification.resource) {
      throw new Error('WECHAT_PAY_NOTIFY_MISSING_RESOURCE');
    }
    return decryptWechatPayResource({
      apiV3Key: this.config.apiV3Key,
      nonce: notification.resource.nonce,
      associatedData: notification.resource.associated_data,
      ciphertext: notification.resource.ciphertext,
    });
  }
}
