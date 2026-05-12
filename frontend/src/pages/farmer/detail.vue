<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="state err"><text>{{ errMsg }}</text></view>

    <template v-else-if="farmer">
      <!-- 头像 + 名字 + 地区 hero -->
      <view class="hero">
        <view class="hero-bg-glow"></view>
        <view class="avatar-wrap">
          <image v-if="farmer.avatarUrl" class="avatar" :src="farmer.avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-placeholder">👨‍🌾</text>
        </view>
        <text class="name">{{ farmer.name }}</text>
        <view class="meta-row">
          <text class="region">📍 {{ farmer.region }}</text>
          <text class="dot">·</text>
          <text class="years">散养 {{ farmer.years }} 年</text>
        </view>
        <view class="badge-row">
          <view class="badge">
            <text class="badge-num">{{ farmer.listingPigsCount }}</text>
            <text class="badge-label">在养可认</text>
          </view>
          <view class="badge">
            <text class="badge-num">{{ farmer.totalPigsCount }}</text>
            <text class="badge-label">累计代养</text>
          </view>
          <view class="badge">
            <text class="badge-num">★ 4.9</text>
            <text class="badge-label">综合评分</text>
          </view>
        </view>
      </view>

      <!-- 故事 -->
      <view v-if="farmer.story" class="story-card">
        <text class="story-eyebrow">— 替 你 养 的 人 —</text>
        <text class="story-body">{{ farmer.story }}</text>
      </view>

      <!-- 在养的猪 -->
      <view class="sec-title">
        <text class="sec-title-text">{{ farmer.name }} 现在替你养着</text>
        <text class="sec-title-sub">{{ pigs.length }} 头猪 · 都可认领</text>
      </view>

      <view v-if="pigs.length === 0" class="empty">
        <text>这位农户暂时没有可认领的猪 🐷</text>
      </view>
      <view v-else class="pig-list">
        <view v-for="p in pigs" :key="p.id" class="pig-card" @tap="goPig(p.id)">
          <image class="pig-cover" :src="p.coverImage" mode="aspectFill" />
          <view class="pig-meta">
            <text class="pig-title">{{ p.title }}</text>
            <view class="pig-tags">
              <text class="tag">{{ p.breed }}</text>
            </view>
            <view class="pig-price-row">
              <text class="pig-price">¥{{ priceInt(p.pricePerShare) }}</text>
              <text class="pig-unit">/份</text>
              <text class="pig-shares">  已认 {{ p.soldShares }}/{{ p.totalShares }}</text>
            </view>
          </view>
          <text class="pig-arrow">›</text>
        </view>
      </view>

      <view class="footer-tip">
        <text>🌾 川北山区慢养土猪 · 全程透明 · 24h 直播</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface Farmer {
  id: string;
  name: string;
  region: string;
  years: number;
  avatarUrl: string;
  story: string | null;
  videoUrl: string;
  listingPigsCount: number;
  totalPigsCount: number;
}
interface Pig {
  id: string;
  title: string;
  breed: string;
  coverImage: string;
  pricePerShare: string;
  totalShares: number;
  soldShares: number;
}

const farmer = ref<Farmer | null>(null);
const pigs = ref<Pig[]>([]);
const loading = ref(true);
const errMsg = ref('');

function priceInt(p: string): string {
  const n = parseFloat(p);
  return Number.isFinite(n) ? String(Math.round(n)) : p;
}

function goPig(id: string) {
  uni.navigateTo({ url: `/pages/pig/detail?id=${id}` });
}

async function load(id: string) {
  loading.value = true;
  try {
    const [f, ps] = await Promise.all([
      request<Farmer>(`/farmers/${id}`, { auth: false }),
      request<Pig[]>(`/farmers/${id}/pigs`, { auth: false }),
    ]);
    farmer.value = f;
    pigs.value = ps;
    uni.setNavigationBarTitle({ title: f.name });
  } catch (e) {
    errMsg.value = e instanceof ApiError ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onLoad((opts: Record<string, string | undefined>) => {
  if (!opts?.id) {
    errMsg.value = '缺少 id 参数';
    loading.value = false;
    return;
  }
  load(opts.id);
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding-bottom: 80rpx;
}
.state {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
}
.state.err { color: #c0392b; }

.hero {
  background: linear-gradient(165deg, #2c1810 0%, #5a2818 60%, #8b3a1a 100%);
  padding: 60rpx 32rpx 80rpx;
  position: relative;
  overflow: hidden;
  text-align: center;
}
.hero-bg-glow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 70% 40%, rgba(255, 158, 61, 0.22), transparent 60%);
  pointer-events: none;
}
.avatar-wrap {
  width: 152rpx;
  height: 152rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 4rpx solid rgba(255, 216, 156, 0.5);
}
.avatar { width: 100%; height: 100%; }
.avatar-placeholder { font-size: 72rpx; }
.name {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #ffd89c;
  margin-top: 24rpx;
  letter-spacing: 4rpx;
  position: relative;
  z-index: 2;
}
.meta-row {
  display: flex;
  justify-content: center;
  align-items: baseline;
  margin-top: 12rpx;
  position: relative;
  z-index: 2;
}
.region, .years {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.78);
}
.dot {
  color: rgba(255, 255, 255, 0.5);
  margin: 0 12rpx;
}

.badge-row {
  display: flex;
  margin-top: 36rpx;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 24rpx;
  padding: 24rpx 0;
  position: relative;
  z-index: 2;
}
.badge {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.badge + .badge {
  border-left: 2rpx solid rgba(255, 216, 156, 0.22);
}
.badge-num {
  font-size: 36rpx;
  font-weight: 800;
  color: #ffd89c;
}
.badge-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 6rpx;
  letter-spacing: 1rpx;
}

.story-card {
  margin: -36rpx 32rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  position: relative;
  z-index: 3;
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.08);
}
.story-eyebrow {
  display: block;
  font-size: 22rpx;
  letter-spacing: 8rpx;
  color: #c0392b;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16rpx;
}
.story-body {
  display: block;
  font-size: 26rpx;
  color: #444;
  line-height: 1.85;
  text-align: justify;
}

.sec-title {
  padding: 40rpx 32rpx 16rpx;
}
.sec-title-text {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #1a1a1a;
}
.sec-title-sub {
  display: block;
  font-size: 22rpx;
  color: #888;
  margin-top: 6rpx;
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #aaa;
  font-size: 26rpx;
}

.pig-list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
}
.pig-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.pig-cover {
  width: 144rpx;
  height: 144rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
  background: #ddd;
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
.pig-tags {
  margin: 8rpx 0;
}
.tag {
  display: inline-block;
  padding: 4rpx 14rpx;
  background: #f0e8d4;
  color: #7a1f1f;
  font-size: 20rpx;
  border-radius: 12rpx;
}
.pig-price-row {
  display: flex;
  align-items: baseline;
}
.pig-price {
  color: #c0392b;
  font-size: 32rpx;
  font-weight: 800;
}
.pig-unit { color: #999; font-size: 22rpx; }
.pig-shares {
  font-size: 22rpx;
  color: #888;
}
.pig-arrow {
  font-size: 40rpx;
  color: #ccc;
  margin-left: 12rpx;
}

.footer-tip {
  text-align: center;
  margin-top: 48rpx;
  padding: 0 32rpx;
}
.footer-tip text {
  font-size: 22rpx;
  color: #aaa;
  letter-spacing: 1rpx;
}
</style>
