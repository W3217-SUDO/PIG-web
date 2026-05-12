<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="state err">
      <text class="err-icon">😢</text>
      <text>{{ errMsg }}</text>
    </view>

    <template v-else-if="data">
      <!-- Hero 邀请头部 -->
      <view class="invite-hero">
        <text class="invite-eyebrow">— 你 被 邀 请 一 起 看 一 头 猪 —</text>
        <view class="host-row">
          <view class="host-avatar">
            <image v-if="data.host?.avatarUrl" class="host-avatar-img" :src="data.host.avatarUrl" mode="aspectFill" />
            <text v-else class="host-placeholder">👤</text>
          </view>
          <text class="host-name">{{ data.host?.nickname || '朋友' }}</text>
          <text class="host-suffix"> 邀请你 →</text>
        </view>
        <text class="invite-msg">他在「私人订猪」认养了一头土猪,养满一年后过年杀年猪饭。</text>
      </view>

      <!-- 猪卡片 -->
      <view v-if="data.pig" class="pig-card">
        <image class="pig-cover" :src="data.pig.coverImage" mode="aspectFill" />
        <view class="pig-info">
          <view class="pig-tags">
            <text class="tag">{{ data.pig.breed }}</text>
            <text class="tag tag-region">📍 {{ data.pig.region }}</text>
          </view>
          <text class="pig-title">{{ data.pig.title }}</text>
          <text class="pig-desc">{{ data.pig.description }}</text>
          <view class="pig-price-row">
            <view class="pig-price">
              <text class="pig-price-yuan">¥</text>
              <text class="pig-price-num">{{ priceInt }}</text>
              <text class="pig-price-unit">/份</text>
            </view>
            <text class="pig-stock">已认领 {{ data.pig.soldShares }}/{{ data.pig.totalShares }}</text>
          </view>
        </view>
      </view>

      <!-- 4 大卖点 -->
      <view class="value-row">
        <view class="value-item">
          <text class="value-icon">🛡️</text>
          <text class="value-text">不卖肉</text>
        </view>
        <view class="value-item">
          <text class="value-icon">🌾</text>
          <text class="value-text">慢养土猪</text>
        </view>
        <view class="value-item">
          <text class="value-icon">📹</text>
          <text class="value-text">24h 直播</text>
        </view>
        <view class="value-item">
          <text class="value-icon">🍲</text>
          <text class="value-text">过年杀猪</text>
        </view>
      </view>

      <!-- 拼猪 v1 说明 -->
      <view class="hint-card">
        <text class="hint-title">关于拼猪 · v1.0</text>
        <text class="hint-body">v1 暂时只支持「邀请你围观」,你可以看见这头猪的成长全过程,但不参与认领。
完整拼猪功能(成员加入 / 共看直播 / 分肉)即将在 v1.5 上线。</text>
      </view>

      <!-- CTA -->
      <view class="cta-bar">
        <view class="cta-btn" @tap="goPig">
          <text>🐷  我 也 想 认 一 头</text>
        </view>
      </view>

      <!-- TTL -->
      <view class="ttl">
        <text>邀请码 {{ data.code }} · {{ ttlText }}过期</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface ShareView {
  code: string;
  expiresAt: string;
  host: { nickname: string; avatarUrl: string } | null;
  order: { sharesCount: number; totalPrice: string; status: string };
  pig: {
    id: string;
    title: string;
    breed: string;
    region: string;
    coverImage: string;
    description: string | null;
    totalShares: number;
    soldShares: number;
    pricePerShare: string;
  } | null;
}

const data = ref<ShareView | null>(null);
const loading = ref(true);
const errMsg = ref('');

const priceInt = computed(() =>
  data.value?.pig ? Math.round(parseFloat(data.value.pig.pricePerShare)) : 0,
);
const ttlText = computed(() => {
  if (!data.value) return '';
  const t = new Date(data.value.expiresAt).getTime();
  const days = Math.ceil((t - Date.now()) / 86400000);
  return days > 0 ? `${days} 天后` : '即将';
});

function goPig() {
  if (data.value?.pig) {
    uni.reLaunch({ url: `/pages/pig/detail?id=${data.value.pig.id}` });
  } else {
    uni.reLaunch({ url: '/pages/index/index' });
  }
}

async function load(code: string) {
  loading.value = true;
  errMsg.value = '';
  try {
    data.value = await request<ShareView>(`/share/${code}`, { auth: false });
  } catch (e) {
    errMsg.value = e instanceof ApiError ? e.message : '邀请加载失败';
  } finally {
    loading.value = false;
  }
}

onLoad((opts: Record<string, string | undefined>) => {
  if (!opts?.code) {
    errMsg.value = '缺少邀请码';
    loading.value = false;
    return;
  }
  load(opts.code);
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding-bottom: 200rpx;
}
.state {
  padding: 200rpx 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state text { color: #999; font-size: 26rpx; }
.err-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.state.err text { color: #c0392b; }

.invite-hero {
  background: linear-gradient(165deg, #2c1810 0%, #5a2818 60%, #8b3a1a 100%);
  padding: 64rpx 40rpx 56rpx;
  color: #fff;
  text-align: center;
}
.invite-eyebrow {
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: #ffd89c;
  font-weight: 700;
  display: block;
  margin-bottom: 24rpx;
}
.host-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.host-avatar {
  width: 96rpx; height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  overflow: hidden;
  border: 4rpx solid rgba(255, 216, 156, 0.5);
}
.host-avatar-img { width: 100%; height: 100%; }
.host-placeholder { font-size: 48rpx; }
.host-name {
  font-size: 36rpx;
  font-weight: 800;
  color: #ffd89c;
  letter-spacing: 1rpx;
}
.host-suffix {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 8rpx;
}
.invite-msg {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.7;
  display: block;
}

.pig-card {
  margin: -32rpx 28rpx 0;
  background: #fff;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.10);
  position: relative;
  z-index: 2;
}
.pig-cover { width: 100%; height: 360rpx; background: #ddd; }
.pig-info { padding: 24rpx 28rpx 28rpx; }
.pig-tags { display: flex; margin-bottom: 12rpx; }
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
.pig-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
  margin-bottom: 12rpx;
}
.pig-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.7;
  display: block;
  margin-bottom: 20rpx;
}
.pig-price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.pig-price-yuan { color: #c0392b; font-size: 28rpx; font-weight: 700; }
.pig-price-num { color: #c0392b; font-size: 44rpx; font-weight: 800; }
.pig-price-unit { color: #999; font-size: 22rpx; }
.pig-stock { color: #888; font-size: 22rpx; }

.value-row {
  display: flex;
  margin: 28rpx 28rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 0;
}
.value-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.value-icon { font-size: 44rpx; }
.value-text {
  font-size: 22rpx;
  color: #555;
  margin-top: 6rpx;
}

.hint-card {
  margin: 28rpx 28rpx 0;
  background: rgba(192, 57, 43, 0.07);
  border-left: 6rpx solid #c0392b;
  padding: 20rpx 24rpx;
  border-radius: 0 16rpx 16rpx 0;
}
.hint-title {
  font-size: 24rpx;
  font-weight: 800;
  color: #c0392b;
  display: block;
  margin-bottom: 8rpx;
}
.hint-body {
  font-size: 22rpx;
  color: #5a2818;
  line-height: 1.7;
  display: block;
}

.cta-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-top: 2rpx solid #f0e8d4;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 100;
}
.cta-btn {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 52rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.36);
}
.cta-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}

.ttl {
  text-align: center;
  margin: 32rpx 0 8rpx;
}
.ttl text {
  font-size: 22rpx;
  color: #aaa;
  letter-spacing: 1rpx;
}
</style>
