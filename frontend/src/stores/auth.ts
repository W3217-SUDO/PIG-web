import { defineStore } from 'pinia';

export interface AuthUser {
  id: string;
  openid: string;
  nickname: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
}

const ACCESS_TOKEN_KEY = 'pig:access_token';
const REFRESH_TOKEN_KEY = 'pig:refresh_token';
const USER_KEY = 'pig:user';
const USER_ROLE_KEY = 'pig:user_role';

function readStorage<T>(key: string, fallback: T): T {
  try {
    return (uni.getStorageSync(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: readStorage(ACCESS_TOKEN_KEY, ''),
    refreshToken: readStorage(REFRESH_TOKEN_KEY, ''),
    user: readStorage<AuthUser | null>(USER_KEY, null),
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.accessToken),
    role: (state) => state.user?.role || readStorage(USER_ROLE_KEY, ''),
  },

  actions: {
    setSession(session: AuthSession) {
      this.accessToken = session.access_token;
      this.refreshToken = session.refresh_token || '';
      this.user = session.user;

      uni.setStorageSync(ACCESS_TOKEN_KEY, session.access_token);
      if (session.refresh_token) uni.setStorageSync(REFRESH_TOKEN_KEY, session.refresh_token);
      else uni.removeStorageSync(REFRESH_TOKEN_KEY);
      uni.setStorageSync(USER_KEY, session.user);
      uni.setStorageSync(USER_ROLE_KEY, session.user.role);
    },

    updateUser(user: Partial<AuthUser>) {
      if (!this.user) return;
      this.user = { ...this.user, ...user };
      uni.setStorageSync(USER_KEY, this.user);
      uni.setStorageSync(USER_ROLE_KEY, this.user.role);
    },

    clearSession() {
      this.accessToken = '';
      this.refreshToken = '';
      this.user = null;
      uni.removeStorageSync(ACCESS_TOKEN_KEY);
      uni.removeStorageSync(REFRESH_TOKEN_KEY);
      uni.removeStorageSync(USER_KEY);
      uni.removeStorageSync(USER_ROLE_KEY);
    },
  },
});
