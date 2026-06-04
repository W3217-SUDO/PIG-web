import { defineStore } from 'pinia';
import { request } from '../utils/request';
import { useAuthStore, type AuthUser } from './auth';

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null as AuthUser | null,
    loading: false,
    loadedAt: 0,
  }),

  actions: {
    hydrateFromAuth() {
      const auth = useAuthStore();
      this.profile = auth.user;
    },

    async fetchMe(force = false) {
      if (this.profile && !force) return this.profile;
      this.loading = true;
      try {
        const user = await request<AuthUser>('/users/me');
        this.profile = user;
        this.loadedAt = Date.now();
        return user;
      } finally {
        this.loading = false;
      }
    },

    setProfile(user: AuthUser | null) {
      this.profile = user;
      this.loadedAt = user ? Date.now() : 0;
    },
  },
});
