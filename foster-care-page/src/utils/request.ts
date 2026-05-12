const BASE_URL = 'http://127.0.0.1:3000/api';
const FARMER_KEY = 'pig:farmer_id';

export function getFarmerId(): string {
  return (uni.getStorageSync(FARMER_KEY) as string) || '';
}

export function setFarmerId(id: string) {
  uni.setStorageSync(FARMER_KEY, id);
}

export function clearFarmerId() {
  uni.removeStorageSync(FARMER_KEY);
}

export function request<T = unknown>(
  url: string,
  opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: unknown } = {},
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method: opts.method || 'GET',
      data: opts.data as never,
      header: { 'Content-Type': 'application/json' },
      timeout: 10000,
      success: (res) => {
        const body = res.data as { code: number; message: string; data: T };
        if (body?.code === 0) {
          resolve(body.data);
        } else {
          reject(new Error(body?.message || '请求失败'));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络错误')),
    });
  });
}
