<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value || 'all'"
        :class="['tab', activeTab === t.value && 'tab-on']"
        @tap="onTab(t.value)"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="empty">
      <text class="empty-icon">🐷</text>
      <text class="empty-text">还没有订单</text>
      <view class="empty-cta" @tap="goHome">
        <text>去挑一头猪</text>
      </view>
    </view>

    <view v-else class="list">
      <view v-for="o in list" :key="o.id" class="order-card" @tap="onOpen(o)">
        <view class="order-head">
          <text class="order-no">订单 {{ o.id.slice(0, 12) }}…</text>
          <text :class="['order-status', 'status-' + o.status]">{{ statusLabel(o.status) }}</text>
        </view>
        <view v-if="o.pig" class="order-body">
          <image class="pig-cover" :src="o.pig.coverImage" mode="aspectFill" />
          <view class="pig-meta">
            <text class="pig-title">{{ o.pig.title }}</text>
            <text class="pig-breed">{{ o.pig.breed }} · {{ o.pig.region }}</text>
            <text class="pig-shares">认领 {{ o.sharesCount }} 份</text>
          </view>
        </view>
        <view class="order-foot">
          <text class="order-time">{{ fmtTime(o.createdAt) }}</text>
          <text class="order-total">¥{{ o.totalPrice }}</text>
        </view>
        <view v-if="o.status === 'pending'" class="order-actions">
          <view class="action-btn ghost" @tap.stop="onCancel(o)"><text>取消</text></view>
          <view class="action-btn primary" @tap.stop="onPay(o)"><text>mock 支付</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface PigBrief {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
}
interface Order {
  id: string;
  createdAt: string;
  pigId: string;
  sharesCount: number;
  unitPrice: string;
  totalPrice: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paidAt: string | null;
  pig?: PigBrief | null;
}

const tabs: Array<{ label: string; value: string }> = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已取消', value: 'cancelled' },
];
const activeTab = ref<string>('');
const list = ref<Order[]>([]);
const loading = ref(true);

function statusLabel(s: string) {
  return s === 'pending' ? '待支付'
    : s === 'paid' ? '已支付'
    : s === 'cancelled' ? '已取消'
    : s === 'refunded' ? '已退款'
    : s;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  loading.value = true;
  try {
    const qs = activeTab.value ? `?status=${activeTab.value}&pageSize=50` : '?pageSize=50';
    const data = await request<{ items: Order[] }>(`/orders/me${qs}`);
    list.value = data.items;
  } catch (e) {
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

function onTab(v: string) {
  activeTab.value = v;
  load();
}

function onOpen(o: Order) {
  uni.navigateTo({ url: `/pages/pig/detail?id=${o.pigId}` });
}

function onCancel(o: Order) {
  uni.showModal({
    title: '提示',
    content: `取消订单 ${o.id.slice(0, 12)}…?`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request(`/orders/${o.id}/cancel`, { method: 'POST' });
        uni.showToast({ title: '已取消', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({ title: e instanceof ApiError ? e.message : '取消失败', icon: 'none' });
      }
    },
  });
}

async function onPay(o: Order) {
  try {
    await request(`/orders/${o.id}/mock-paid`, { method: 'POST' });
    uni.showToast({ title: '支付成功', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '支付失败', icon: 'none' });
  }
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}

onShow(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
}
.tabs {
  background: #fff;
  display: flex;
  padding: 0 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}
.tab {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  position: relative;
}
.tab text {
  font-size: 26rpx;
  color: #888;
}
.tab-on text { color: #c0392b; font-weight: 800; }
.tab-on::after {
  content: '';
  position: absolute;
  bottom: 0; left: 30%; right: 30%;
  height: 4rpx;
  background: #c0392b;
  border-radius: 2rpx;
}

.state, .empty {
  padding: 200rpx 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state text, .empty-text { color: #999; font-size: 28rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 16rpx; }
.empty-cta {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  padding: 20rpx 56rpx;
  border-radius: 44rpx;
}
.empty-cta text { color: #fff; font-size: 28rpx; font-weight: 700; }

.list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}
.order-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 2rpx dashed #f0e8d4;
  margin-bottom: 16rpx;
}
.order-no {
  font-size: 22rpx;
  color: #999;
}
.order-status {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}
.status-pending { background: #fff5e6; color: #ff9800; }
.status-paid { background: #e7f7ee; color: #1aad19; }
.status-cancelled { background: #f3f3f3; color: #999; }
.status-refunded { background: #fde8e7; color: #c0392b; }

.order-body {
  display: flex;
  padding-bottom: 16rpx;
}
.pig-cover {
  width: 144rpx; height: 144rpx;
  border-radius: 16rpx;
  background: #ddd;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.pig-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.pig-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.pig-breed {
  font-size: 22rpx;
  color: #888;
  margin-top: 4rpx;
}
.pig-shares {
  margin-top: auto;
  font-size: 24rpx;
  color: #c0392b;
}

.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 12rpx;
  border-top: 2rpx solid #f5f3ec;
}
.order-time {
  font-size: 22rpx;
  color: #aaa;
}
.order-total {
  font-size: 30rpx;
  color: #c0392b;
  font-weight: 800;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f5f3ec;
}
.action-btn {
  padding: 12rpx 28rpx;
  border-radius: 28rpx;
  margin-left: 16rpx;
}
.action-btn.ghost {
  border: 2rpx solid #ddd;
}
.action-btn.ghost text { color: #666; font-size: 22rpx; }
.action-btn.primary {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
}
.action-btn.primary text { color: #fff; font-size: 22rpx; font-weight: 700; }
</style>
