/**
 * 代养人端专用 HTTP 请求封装
 * - 使用 X-Foster-Token 头而非 Authorization: Bearer
 * - 维护 farmer_id 和 foster_token 的 storage 操作
 */

function readBaseUrl(): string {
  // #ifdef MP-WEIXIN
  // 微信开发者工具（envVersion=develop）时，自动切换到本地后端
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = (uni as any).getAccountInfoSync?.();
    if (info?.miniProgram?.envVersion === 'develop') {
      return 'http://127.0.0.1:3000/api';
    }
  } catch {
    // ignore
  }
  // #endif
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const apiBase: string = import.meta.env.VITE_API_BASE_URL || '';
  if (apiBase) return apiBase;
  return 'https://www.rockingwei.online/api';
}

const BASE_URL = readBaseUrl();
const FARMER_KEY = 'pig:farmer_id';
const TOKEN_KEY = 'pig:foster_token';

function formatNetworkError(errMsg: string, url: string): string {
  const msg = errMsg || '网络错误';
  const shouldExplain =
    msg.includes('request:fail') ||
    msg.includes('ERR_CONNECTION') ||
    msg.includes('timeout') ||
    msg.includes('SSL') ||
    msg.includes('TLS');

  if (!shouldExplain) return msg;

  return [
    msg,
    `请求地址: ${url}`,
    '请检查: 1) 微信公众平台 request 合法域名是否已添加 https://www.rockingwei.online 2) 腾讯云备案接入/网站拦截是否已解除 3) 服务器 HTTPS 是否公网可访问',
  ].join('\n');
}

export function getFarmerId(): string {
  try {
    return (uni.getStorageSync(FARMER_KEY) as string) || '';
  } catch {
    return '';
  }
}

export function setFarmerId(id: string): void {
  uni.setStorageSync(FARMER_KEY, id);
}

export function clearFarmerId(): void {
  uni.removeStorageSync(FARMER_KEY);
}

export function getFosterToken(): string {
  try {
    return (uni.getStorageSync(TOKEN_KEY) as string) || '';
  } catch {
    return '';
  }
}

export function setFosterToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function clearFosterToken(): void {
  uni.removeStorageSync(TOKEN_KEY);
}

/** 清除代养人所有登录态 */
export function clearAuth(): void {
  clearFarmerId();
  clearFosterToken();
}

export function request<T = unknown>(
  url: string,
  opts: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; data?: unknown } = {},
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const token = getFosterToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Foster-Token'] = token;

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method: (opts.method || 'GET') as any,
      data: opts.data as never,
      header: headers,
      timeout: 15000,
      success: (res) => {
        const body = res.data as { code: number; message: string; data: T };
        if (body?.code === 0) {
          resolve(body.data);
        } else {
          reject(new Error(body?.message || '请求失败'));
        }
      },
      fail: (err) => {
        const msg = (err as any).errMsg || '';
        reject(new Error(formatNetworkError(msg, fullUrl)));
      },
    });
  });
}
