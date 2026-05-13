/**
 * 统一 HTTP 请求封装:
 * - 用 uni.request 跨平台 (H5 / 微信小程序 / APP 都行)
 * - 自动加 Authorization: Bearer <access_token> (来自 uni.storage)
 * - 后端约定响应体 { code, message, data }, code=0 视为成功
 * - 401 时清 token, 业务侧自行决定跳登录
 */

/** Vite 在 H5 模式下注入 import.meta.env, 小程序/APP 由打包工具替换 */
function readBaseUrl(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromEnv = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  return fromEnv || 'http://127.0.0.1:3000/api';
}

const BASE_URL = readBaseUrl();
const TOKEN_KEY = 'pig:access_token';

// 401 并发跳登录去重:多个请求同时 401 时,只跳一次
let redirectingToLogin = false;

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  constructor(
    public readonly bizCode: number,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string {
  try {
    return (uni.getStorageSync(TOKEN_KEY) as string) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function clearToken(): void {
  uni.removeStorageSync(TOKEN_KEY);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  /** 默认 true; 设 false 不携带 token (登录接口用) */
  auth?: boolean;
  header?: Record<string, string>;
}

export function request<T = unknown>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, auth = true, header = {} } = opts;
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  };
  if (auth) {
    const tok = getToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data: data as never,
      header: headers,
      timeout: 10000,
      success: (res) => {
        const status = res.statusCode || 0;
        const body = res.data as ApiResponse<T> | undefined;
        if (status === 401) {
          clearToken();
          // 自动跳登录页(避开在登录页本身触发循环;并发 401 只跳一次)
          if (!redirectingToLogin) {
            try {
              const pages = getCurrentPages();
              const cur = pages.length ? pages[pages.length - 1] : null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const route = (cur as any)?.route || (cur as any)?.$page?.fullPath || '';
              if (!route.includes('pages/login')) {
                redirectingToLogin = true;
                uni.navigateTo({
                  url: '/pages/login/index',
                  complete: () => {
                    setTimeout(() => {
                      redirectingToLogin = false;
                    }, 500);
                  },
                });
              }
            } catch {
              // 忽略
            }
          }
          reject(new ApiError(10001, '未登录或登录已过期', 401));
          return;
        }
        if (!body || typeof body !== 'object') {
          reject(new ApiError(90099, `非 JSON 响应 (HTTP ${status})`, status));
          return;
        }
        if (body.code === 0) {
          resolve(body.data);
        } else {
          reject(new ApiError(body.code, body.message || '请求失败', status));
        }
      },
      fail: (err) => {
        reject(new ApiError(99999, err.errMsg || '网络错误', 0));
      },
    });
  });
}
