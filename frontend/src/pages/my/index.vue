<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="header-bg-glow"></view>
      <view class="user-row">
        <view class="avatar" @tap="onEditProfile">
          <image v-if="user?.avatarUrl" class="avatar-img" :src="user.avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-placeholder">👤</text>
        </view>
        <view class="user-meta" @tap="onEditProfile">
          <text class="user-name">{{ user?.nickname || '未设置昵称' }}</text>
          <text class="user-id">ID: {{ user?.id ? user.id.slice(0, 12) : '未登录' }}</text>
        </view>
        <view v-if="user" class="edit-icon" @tap="onEditProfile">
          <text>✏️</text>
        </view>
        <view v-else class="login-btn" @tap="onLogin">
          <text>去登录</text>
        </view>
      </view>
    </view>

    <!-- 我的资产快览 -->
    <view class="quick-row">
      <view class="quick-item" @tap="goMyPigs">
        <text class="quick-num">{{ stats.pigs }}</text>
        <text class="quick-label">🐷 我的猪</text>
      </view>
      <view class="quick-item" @tap="goOrders">
        <text class="quick-num">{{ stats.orders }}</text>
        <text class="quick-label">📦 订单</text>
      </view>
      <view class="quick-item" @tap="goWallet">
        <text class="quick-num">¥{{ stats.walletInt }}</text>
        <text class="quick-label">💰 钱包</text>
      </view>
    </view>

    <!-- 菜单 -->
    <view class="menu-card">
      <view class="menu-item" @tap="onAddresses">
        <text class="menu-icon">📍</text>
        <text class="menu-label">收货地址</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-divider"></view>
      <view class="menu-item" @tap="goOrders">
        <text class="menu-icon">📦</text>
        <text class="menu-label">我的订单</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-divider"></view>
      <view class="menu-item" @tap="goWallet">
        <text class="menu-icon">💰</text>
        <text class="menu-label">钱包流水</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-divider"></view>
      <view class="menu-item" @tap="goMessages">
        <text class="menu-icon">🔔</text>
        <text class="menu-label">消息中心</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="menu-card">
      <view class="menu-item" @tap="todo('帮助与反馈')">
        <text class="menu-icon">❓</text>
        <text class="menu-label">帮助与反馈</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-divider"></view>
      <view class="menu-item" @tap="goStatic('terms')">
        <text class="menu-icon">📜</text>
        <text class="menu-label">用户协议</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-divider"></view>
      <view class="menu-item" @tap="goStatic('privacy')">
        <text class="menu-icon">🔒</text>
        <text class="menu-label">隐私政策</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-divider"></view>
      <view class="menu-item" @tap="goStatic('about')">
        <text class="menu-icon">ℹ️</text>
        <text class="menu-label">关于「私人订猪」</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view v-if="user" class="logout-btn" @tap="onLogout">
      <text>退出登录</text>
    </view>

    <view class="footer">
      <text class="footer-text">🐷 「认一头猪 · 过一个年」</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, getToken, clearToken, ApiError } from '../../utils/request';

interface UserInfo {
  id: string;
  openid: string;
  nickname: string;
  avatarUrl: string;
  phone: string | null;
  role: string;
}

const user = ref<UserInfo | null>(null);
const stats = reactive({ pigs: 0, orders: 0, walletInt: '0' });

async function loadMe() {
  if (!getToken()) {
    user.value = null;
    stats.pigs = 0;
    stats.orders = 0;
    stats.walletInt = '0';
    return;
  }
  try {
    const [u, ordersResp, walletResp] = await Promise.all([
      request<UserInfo>('/users/me'),
      request<{ total: number; items: Array<{ status: string }> }>('/orders/me?pageSize=50').catch(() => ({ total: 0, items: [] })),
      request<{ wallet: { balance: string } }>('/wallet/me').catch(() => ({ wallet: { balance: '0.00' } })),
    ]);
    user.value = u;
    stats.orders = ordersResp.total || 0;
    stats.pigs = ordersResp.items.filter((o) => o.status === 'paid').length;
    stats.walletInt = walletResp.wallet.balance.split('.')[0] || '0';
  } catch (e) {
    user.value = null;
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  }
}

function goOrders() {
  if (!user.value) return onLogin();
  uni.navigateTo({ url: '/pages/my/orders' });
}

function goWallet() {
  if (!user.value) return onLogin();
  uni.navigateTo({ url: '/pages/my/wallet' });
}

function goMessages() {
  if (!user.value) return onLogin();
  uni.navigateTo({ url: '/pages/messages/index' });
}

function goMyPigs() {
  if (!user.value) return onLogin();
  uni.navigateTo({ url: '/pages/my/pigs' });
}

function goStatic(name: 'terms' | 'privacy' | 'about') {
  uni.navigateTo({ url: `/pages/static/${name}` });
}

function onLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function onLogout() {
  uni.showModal({
    title: '提示',
    content: '确认退出登录?',
    success: (res) => {
      if (res.confirm) {
        clearToken();
        user.value = null;
        uni.showToast({ title: '已退出', icon: 'success' });
      }
    },
  });
}

function onEditProfile() {
  if (!user.value) {
    onLogin();
    return;
  }
  uni.navigateTo({ url: '/pages/my/profile' });
}

function onAddresses() {
  if (!user.value) {
    onLogin();
    return;
  }
  uni.navigateTo({ url: '/pages/my/addresses' });
}

function todo(name: string) {
  uni.showToast({ title: `${name}(后续切片实现)`, icon: 'none', duration: 1200 });
}

onShow(() => {
  loadMe();
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding-bottom: 80rpx;
}
.header {
  background: linear-gradient(165deg, #2c1810 0%, #5a2818 60%, #8b3a1a 100%);
  padding: 60rpx 40rpx 100rpx;
  position: relative;
  overflow: hidden;
}
.header-bg-glow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 75% 40%, rgba(255, 158, 61, 0.25), transparent 60%);
  pointer-events: none;
}
.user-row {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 2;
}
.avatar {
  width: 128rpx; height: 128rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin-right: 28rpx;
  overflow: hidden;
  border: 4rpx solid rgba(255, 216, 156, 0.5);
}
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { font-size: 60rpx; }
.user-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
}
.user-id {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 6rpx;
}
.edit-icon {
  width: 64rpx; height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
}
.edit-icon text { font-size: 28rpx; }
.login-btn {
  background: linear-gradient(135deg, #ffd89c, #ff9e3d);
  padding: 16rpx 28rpx;
  border-radius: 32rpx;
}
.login-btn text {
  color: #2c1810;
  font-size: 26rpx;
  font-weight: 700;
}

.quick-row {
  display: flex;
  margin: -56rpx 32rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx 0;
  position: relative;
  z-index: 3;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}
.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.quick-item + .quick-item {
  border-left: 2rpx solid #f0e8d4;
}
.quick-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #c0392b;
}
.quick-label {
  font-size: 22rpx;
  color: #888;
  margin-top: 8rpx;
}

.menu-card {
  margin: 28rpx 32rpx 0;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 28rpx;
}
.menu-icon { font-size: 36rpx; margin-right: 24rpx; }
.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 600;
}
.menu-arrow { font-size: 32rpx; color: #ccc; }
.menu-divider {
  height: 2rpx;
  background: #f5f3ec;
  margin-left: 88rpx;
}

.logout-btn {
  margin: 48rpx 32rpx 0;
  background: #fff;
  border-radius: 48rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logout-btn text {
  color: #c0392b;
  font-size: 28rpx;
  font-weight: 600;
}

.footer {
  text-align: center;
  margin-top: 48rpx;
}
.footer-text {
  font-size: 22rpx;
  color: #aaa;
  letter-spacing: 1rpx;
}
</style>
