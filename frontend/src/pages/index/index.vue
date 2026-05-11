<template>
  <view class="page">
    <view class="card">
      <view class="card-title">🐷 PIG 后端探活</view>
      <view class="row">
        <text class="label">/api/health</text>
        <text :class="['badge', healthStatus]">{{ healthLabel }}</text>
      </view>
      <view v-if="health" class="kv">
        <view>db: <text :class="health.db === 'ok' ? 'ok' : 'fail'">{{ health.db }}</text></view>
        <view>redis: <text :class="health.redis === 'ok' ? 'ok' : 'fail'">{{ health.redis }}</text></view>
        <view>env: {{ health.env }}</view>
        <view>uptime: {{ health.uptime_seconds }}s</view>
      </view>
      <button class="btn" size="mini" @click="refreshHealth">刷新</button>
    </view>

    <view class="card">
      <view class="card-title">🔐 dev-login → /me</view>
      <button v-if="!token" class="btn primary" @click="onDevLogin">dev 登录</button>
      <button v-else class="btn" @click="onLogout">登出</button>

      <view v-if="me" class="kv">
        <view>id: {{ me.id }}</view>
        <view>openid: {{ me.openid }}</view>
        <view>nickname: {{ me.nickname }}</view>
        <view>role: {{ me.role }}</view>
      </view>
      <view v-if="errMsg" class="err">{{ errMsg }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { request, setToken, getToken, clearToken, ApiError } from '../../utils/request';

interface HealthData {
  status: string;
  db: string;
  redis: string;
  env: string;
  uptime_seconds: number;
}
interface LoginData {
  user: { id: string; openid: string; nickname: string; role: string };
  access_token: string;
  refresh_token: string;
}
interface MeData {
  id: string;
  openid: string;
  nickname: string;
  role: string;
}

const health = ref<HealthData | null>(null);
const healthStatus = ref<'ok' | 'fail' | 'pending'>('pending');
const token = ref<string>('');
const me = ref<MeData | null>(null);
const errMsg = ref<string>('');

const healthLabel = computed(() => {
  if (healthStatus.value === 'pending') return '...';
  return healthStatus.value === 'ok' ? 'OK' : 'FAIL';
});

async function refreshHealth() {
  healthStatus.value = 'pending';
  try {
    const data = await request<HealthData>('/health', { auth: false });
    health.value = data;
    healthStatus.value = data.status === 'ok' ? 'ok' : 'fail';
  } catch (e) {
    healthStatus.value = 'fail';
    health.value = null;
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  }
}

async function onDevLogin() {
  errMsg.value = '';
  try {
    const data = await request<LoginData>('/auth/dev-login', {
      method: 'POST',
      data: {},
      auth: false,
    });
    setToken(data.access_token);
    token.value = data.access_token;
    await loadMe();
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  }
}

async function loadMe() {
  try {
    me.value = await request<MeData>('/auth/me');
  } catch (e) {
    me.value = null;
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  }
}

function onLogout() {
  clearToken();
  token.value = '';
  me.value = null;
  errMsg.value = '';
}

onMounted(() => {
  refreshHealth();
  token.value = getToken();
  if (token.value) loadMe();
});
</script>

<style>
.page {
  padding: 32rpx;
  background: #f5f6f8;
  min-height: 100vh;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.card-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.label {
  font-size: 28rpx;
  color: #666;
}
.badge {
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
}
.badge.ok {
  background: #e7f7ee;
  color: #1aad19;
}
.badge.fail {
  background: #fde8e7;
  color: #ff4d4f;
}
.badge.pending {
  background: #eee;
  color: #999;
}
.kv {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;
  margin-top: 12rpx;
}
.kv .ok {
  color: #1aad19;
}
.kv .fail {
  color: #ff4d4f;
}
.btn {
  margin-top: 16rpx;
}
.btn.primary {
  background: #1aad19;
  color: #fff;
}
.err {
  color: #ff4d4f;
  font-size: 24rpx;
  margin-top: 16rpx;
  word-break: break-all;
}
</style>
