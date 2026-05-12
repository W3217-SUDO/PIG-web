<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="state err"><text>{{ errMsg }}</text></view>

    <template v-else-if="pig">
      <!-- 视频区 -->
      <view class="video-wrap">
        <!-- #ifdef H5 -->
        <video
          v-if="pig.mockVideoUrl"
          class="video"
          :src="pig.mockVideoUrl"
          controls
          autoplay
          loop
          muted
          playsinline
        ></video>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <video
          v-if="pig.mockVideoUrl"
          class="video"
          :src="pig.mockVideoUrl"
          :controls="true"
          :show-fullscreen-btn="true"
          :enable-progress-gesture="false"
          autoplay
          loop
          muted
          object-fit="cover"
        ></video>
        <!-- #endif -->

        <view v-if="!pig.mockVideoUrl" class="no-video">
          <text class="no-video-icon">📹</text>
          <text class="no-video-text">这头猪暂未接入直播</text>
        </view>

        <!-- LIVE 角标 -->
        <view class="badge live-badge">
          <view class="live-pulse"></view>
          <text>LIVE</text>
        </view>
        <view class="badge viewer-badge">
          <text>👀 {{ viewers }} 人</text>
        </view>
      </view>

      <!-- 猪信息 -->
      <view class="info-card">
        <view class="title-row">
          <text class="title">{{ pig.title }}</text>
          <view class="tag">{{ pig.breed }}</view>
        </view>
        <text class="region">📍 {{ pig.region }}{{ farmer ? '  ·  ' + farmer.name + ' 农户' : '' }}</text>
      </view>

      <!-- 弹幕 / 评论(mock,营造直播氛围) -->
      <view class="bullet-section">
        <text class="bullet-eyebrow">— 实 时 弹 幕 —</text>
        <view class="bullet-list">
          <view v-for="(b, i) in bullets" :key="i" class="bullet-row">
            <text class="bullet-name">{{ b.user }}:</text>
            <text class="bullet-text">{{ b.text }}</text>
          </view>
        </view>
      </view>

      <!-- 提示 -->
      <view class="hint">
        <text>💡 v1 阶段直播为预录片段,真实 24h 直播将在 v1.5 接入腾讯云直播。</text>
      </view>

      <!-- 底部 CTA -->
      <view class="cta-bar">
        <view class="cta-info">
          <text class="cta-price-yuan">¥</text>
          <text class="cta-price-num">{{ priceInt(pig.pricePerShare) }}</text>
          <text class="cta-price-unit">/份</text>
        </view>
        <view class="cta-btn" @tap="onOrder">
          <text>认 养 这 头 →</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface Pig {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
  mockVideoUrl: string;
  pricePerShare: string;
  farmer: { id: string; name: string } | null;
}

const pig = ref<Pig | null>(null);
const farmer = ref<{ name: string } | null>(null);
const loading = ref(true);
const errMsg = ref('');
const viewers = ref(0);

// mock 弹幕(从一个池子里随机抽几条)
const bulletPool = [
  { user: '张大爷', text: '今早刚换了山泉水,猪喝得很欢' },
  { user: '广元美食', text: '隔屏看着饿了 哈哈' },
  { user: '城里阿姨', text: '我家这头叫"福福"' },
  { user: '认领人 002', text: '今天的红薯切得真大块' },
  { user: '老李', text: '中午加点苕藤' },
  { user: '吃货小张', text: '腊月在哪取猪呀' },
  { user: '游客 1043', text: '这就是真正的散养土猪' },
  { user: '认领人 008', text: '看到一年长一斤了 ✨' },
  { user: '小红', text: '配料表呢 我看看' },
  { user: '猪场之友', text: '看着比朋友家的胖!' },
];
const bullets = ref<typeof bulletPool>([]);

let bulletTimer: ReturnType<typeof setInterval> | null = null;
let viewerTimer: ReturnType<typeof setInterval> | null = null;

function priceInt(p: string): string {
  const n = parseFloat(p);
  return Number.isFinite(n) ? String(Math.round(n)) : p;
}

function pickBullets(n: number) {
  const result: typeof bulletPool = [];
  const used = new Set<number>();
  while (result.length < n && used.size < bulletPool.length) {
    const i = Math.floor(Math.random() * bulletPool.length);
    if (used.has(i)) continue;
    used.add(i);
    result.push(bulletPool[i]);
  }
  return result;
}

function onOrder() {
  if (!pig.value) return;
  uni.navigateTo({ url: `/pages/order/confirm?pigId=${pig.value.id}` });
}

async function load(id: string) {
  loading.value = true;
  try {
    const p = await request<Pig>(`/pigs/${id}`, { auth: false });
    pig.value = p;
    farmer.value = p.farmer;

    // mock 在线人数 + 弹幕
    viewers.value = 80 + Math.floor(Math.random() * 200);
    bullets.value = pickBullets(6);

    viewerTimer = setInterval(() => {
      viewers.value += Math.floor(Math.random() * 7) - 3;
      if (viewers.value < 60) viewers.value = 60 + Math.floor(Math.random() * 20);
    }, 3000);
    bulletTimer = setInterval(() => {
      bullets.value = [pickBullets(1)[0], ...bullets.value.slice(0, 7)];
    }, 4000);

    uni.setNavigationBarTitle({ title: `直播 · ${p.title.slice(0, 12)}` });
  } catch (e) {
    errMsg.value = e instanceof ApiError ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onLoad((opts: Record<string, string | undefined>) => {
  if (!opts?.pigId) {
    errMsg.value = '缺少 pigId 参数';
    loading.value = false;
    return;
  }
  load(opts.pigId);
});

onUnmounted(() => {
  if (bulletTimer) clearInterval(bulletTimer);
  if (viewerTimer) clearInterval(viewerTimer);
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #0f1115;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}
.state {
  padding: 200rpx 0;
  text-align: center;
  color: #888;
}
.state.err { color: #ff6b6b; }

.video-wrap {
  width: 100%;
  height: 560rpx;
  background: #000;
  position: relative;
  overflow: hidden;
}
.video {
  width: 100%;
  height: 100%;
  background: #000;
  display: block;
}
.no-video {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.no-video-icon { font-size: 80rpx; }
.no-video-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
  margin-top: 16rpx;
}

.badge {
  position: absolute;
  padding: 10rpx 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  z-index: 2;
}
.live-badge {
  top: 28rpx;
  left: 28rpx;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  box-shadow: 0 4rpx 16rpx rgba(255, 75, 43, 0.36);
}
.live-badge text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.live-pulse {
  width: 12rpx; height: 12rpx;
  background: #fff;
  border-radius: 50%;
  margin-right: 10rpx;
}
.viewer-badge {
  top: 28rpx;
  right: 28rpx;
  background: rgba(0, 0, 0, 0.55);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
}
.viewer-badge text {
  color: #fff;
  font-size: 22rpx;
}

.info-card {
  background: #1a1d24;
  padding: 28rpx 32rpx;
  color: #fff;
  border-bottom: 2rpx solid #232730;
}
.title-row {
  display: flex;
  align-items: center;
}
.title {
  font-size: 32rpx;
  font-weight: 800;
  flex: 1;
}
.tag {
  background: #2a2f3a;
  color: #ffd89c;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  margin-left: 12rpx;
}
.region {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 8rpx;
  display: block;
}

.bullet-section {
  padding: 32rpx 32rpx 24rpx;
}
.bullet-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: #ffd89c;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16rpx;
  opacity: 0.6;
}
.bullet-list {
  display: flex;
  flex-direction: column;
}
.bullet-row {
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 24rpx;
  margin-bottom: 12rpx;
  display: flex;
  flex-wrap: nowrap;
  border: 2rpx solid rgba(255, 216, 156, 0.08);
}
.bullet-name {
  color: #ffd89c;
  font-size: 22rpx;
  font-weight: 700;
  margin-right: 8rpx;
  flex-shrink: 0;
}
.bullet-text {
  color: rgba(255, 255, 255, 0.85);
  font-size: 22rpx;
  flex: 1;
}

.hint {
  padding: 16rpx 32rpx;
  margin: 12rpx 32rpx 0;
  background: rgba(255, 216, 156, 0.10);
  border-left: 4rpx solid #ffd89c;
  border-radius: 0 12rpx 12rpx 0;
}
.hint text {
  color: rgba(255, 216, 156, 0.85);
  font-size: 22rpx;
  line-height: 1.7;
}

.cta-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1d24;
  border-top: 2rpx solid #232730;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  z-index: 100;
}
.cta-info {
  flex: 1;
  display: flex;
  align-items: baseline;
}
.cta-price-yuan { color: #ffd89c; font-size: 24rpx; font-weight: 700; }
.cta-price-num {
  color: #ffd89c;
  font-size: 44rpx;
  font-weight: 800;
}
.cta-price-unit { color: rgba(255, 216, 156, 0.6); font-size: 22rpx; margin-left: 4rpx; }
.cta-btn {
  width: 320rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.40);
}
.cta-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}
</style>
