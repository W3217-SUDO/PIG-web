<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="empty">
      <text class="empty-icon">🐷</text>
      <text class="empty-text">你还没有认领任何猪</text>
      <view class="empty-cta" @tap="goHome">
        <text>去挑一头</text>
      </view>
    </view>

    <view v-else class="list">
      <view class="header">
        <text class="header-title">我的猪圈</text>
        <text class="header-sub">共 {{ list.length }} 头 · 都在山里替你养着</text>
      </view>

      <view v-for="o in list" :key="o.id" class="pig-card" @tap="onOpen(o)">
        <view v-if="o.pig" class="pig-body">
          <image class="pig-cover" :src="o.pig.coverImage" mode="aspectFill" />
          <view class="pig-meta">
            <text class="pig-title">{{ o.pig.title }}</text>
            <view class="pig-tags">
              <text class="tag">{{ o.pig.breed }}</text>
              <text class="tag tag-region">📍 {{ o.pig.region }}</text>
            </view>
            <view class="pig-stats">
              <view class="stat">
                <text class="stat-num">{{ o.sharesCount }}</text>
                <text class="stat-label">份额</text>
              </view>
              <view class="stat">
                <text class="stat-num">{{ daysSince(o.paidAt) }}</text>
                <text class="stat-label">已养(天)</text>
              </view>
              <view class="stat">
                <text class="stat-num">¥{{ o.totalPrice.split('.')[0] }}</text>
                <text class="stat-label">已付</text>
              </view>
            </view>
          </view>
        </view>
        <view class="pig-foot">
          <view class="live-tag">
            <view class="live-pulse"></view>
            <text>正在直播</text>
          </view>
          <text class="arrow">看详情 ›</text>
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
  pigId: string;
  sharesCount: number;
  totalPrice: string;
  paidAt: string;
  pig?: PigBrief | null;
}

const list = ref<Order[]>([]);
const loading = ref(true);

function daysSince(iso: string) {
  if (!iso) return 0;
  return Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function onOpen(o: Order) {
  uni.navigateTo({ url: `/pages/pig/detail?id=${o.pigId}` });
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}

async function load() {
  loading.value = true;
  try {
    const data = await request<{ items: Order[] }>('/orders/me?status=paid&pageSize=50');
    list.value = data.items;
  } catch (e) {
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

onShow(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
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
  padding: 0 24rpx 32rpx;
  display: flex;
  flex-direction: column;
}
.header {
  padding: 32rpx 16rpx 16rpx;
}
.header-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
}
.header-sub {
  font-size: 24rpx;
  color: #888;
  margin-top: 6rpx;
}

.pig-card {
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.06);
}
.pig-body {
  display: flex;
  padding: 24rpx;
}
.pig-cover {
  width: 200rpx; height: 200rpx;
  border-radius: 20rpx;
  background: #ddd;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.pig-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.pig-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
}
.pig-tags {
  display: flex;
  margin: 10rpx 0;
}
.tag {
  display: inline-block;
  padding: 4rpx 14rpx;
  background: #f0e8d4;
  color: #7a1f1f;
  font-size: 20rpx;
  border-radius: 12rpx;
  margin-right: 8rpx;
}
.tag-region { background: #e8f0e2; color: #3a6d3a; }

.pig-stats {
  display: flex;
  margin-top: auto;
  background: #faf6ec;
  border-radius: 16rpx;
  padding: 12rpx 0;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 28rpx;
  font-weight: 800;
  color: #c0392b;
}
.stat-label {
  font-size: 20rpx;
  color: #999;
  margin-top: 2rpx;
}

.pig-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2rpx solid #f5f3ec;
  padding: 16rpx 24rpx;
}
.live-tag {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}
.live-pulse {
  width: 10rpx; height: 10rpx;
  background: #fff;
  border-radius: 50%;
  margin-right: 8rpx;
}
.live-tag text {
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.arrow {
  font-size: 24rpx;
  color: #c0392b;
  font-weight: 700;
}
</style>
