const BASE_URL = 'http://127.0.0.1:3000/api';
const FARMER_KEY = 'pig:farmer_id';
const TOKEN_KEY = 'pig:foster_token';

export function getFarmerId(): string {
  return (uni.getStorageSync(FARMER_KEY) as string) || '';
}

export function setFarmerId(id: string) {
  uni.setStorageSync(FARMER_KEY, id);
}

export function clearFarmerId() {
  uni.removeStorageSync(FARMER_KEY);
}

export function getFosterToken(): string {
  return (uni.getStorageSync(TOKEN_KEY) as string) || '';
}

export function setFosterToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function clearFosterToken() {
  uni.removeStorageSync(TOKEN_KEY);
}

/** 清除所有登录态 */
export function clearAuth() {
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
      method: opts.method || 'GET',
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
        const msg = err.errMsg || '';
        if (msg.includes('timeout')) {
          reject(new Error('网络超时，请检查：1）后端是否运行 2）微信开发者工具已勾选"不校验合法域名"'));
        } else {
          reject(new Error(msg || '网络错误'));
        }
      },
    });
  });
}
