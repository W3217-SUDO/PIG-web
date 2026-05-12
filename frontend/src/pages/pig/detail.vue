<template>
  <view class="page">
    <view v-if="loading" class="loading-state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="error-state"><text>{{ errMsg }}</text></view>

    <template v-else-if="pig">
      <!-- ========== 封面 + 视频(可点播放)========== -->
      <view class="cover-wrap">
        <image class="cover-img" :src="pig.coverImage" mode="aspectFill" />
        <view class="cover-gradient"></view>
        <view class="live-badge">
          <view class="live-pulse"></view>
          <text>LIVE · 24h 直播</text>
        </view>
        <view v-if="pig.mockVideoUrl" class="play-btn" @tap="onPlayVideo">
          <text class="play-btn-icon">▶</text>
        </view>
        <view class="cover-stat">
          <text>📹 {{ liveViewers }} 人在线观看</text>
        </view>
      </view>

      <!-- ========== 基础信息卡 ========== -->
      <view class="info-card">
        <view class="info-tags">
          <text class="tag tag-breed">{{ pig.breed }}</text>
          <text class="tag tag-region">📍 {{ pig.region }}</text>
          <text v-if="pig.status === 'sold_out'" class="tag tag-soldout">已售罄</text>
        </view>
        <text class="info-title">{{ pig.title }}</text>
        <text class="info-desc">{{ pig.description }}</text>

        <view class="info-stats">
          <view class="info-stat">
            <text class="info-stat-num">{{ Math.round(parseFloat(pig.weightKg)) }}</text>
            <text class="info-stat-label">当前体重 (kg)</text>
          </view>
          <view class="info-stat-divider"></view>
          <view class="info-stat">
            <text class="info-stat-num">{{ Math.round(parseFloat(pig.expectedWeightKg)) }}</text>
            <text class="info-stat-label">出栏预期 (kg)</text>
          </view>
          <view class="info-stat-divider"></view>
          <view class="info-stat">
            <text class="info-stat-num">~365</text>
            <text class="info-stat-label">慢养 (天)</text>
          </view>
        </view>

        <view class="progress-row">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progressPct + '%' }" />
          </view>
          <text class="progress-text">{{ pig.soldShares }} / {{ pig.totalShares }} 份已认领</text>
        </view>
      </view>

      <!-- ========== 农户卡片(可点) ========== -->
      <view v-if="pig.farmer" class="farmer-card" @tap="goFarmer">
        <text class="section-title">— 替你养的人 —</text>
        <view class="farmer-row">
          <image class="farmer-avatar" :src="pig.farmer.avatarUrl" mode="aspectFill" />
          <view class="farmer-meta">
            <text class="farmer-name">{{ pig.farmer.name }}</text>
            <view class="farmer-sub">
              <text class="farmer-region">📍 {{ pig.farmer.region }}</text>
              <text class="farmer-years">· 散养 {{ pig.farmer.years }} 年</text>
            </view>
          </view>
          <text class="farmer-star">★ 4.9</text>
          <text class="farmer-arrow">›</text>
        </view>
        <text v-if="pig.farmer.story" class="farmer-story">{{ pig.farmer.story }}</text>
      </view>

      <!-- ========== 拼猪提示 ========== -->
      <view class="share-hint" @tap="onShareHint">
        <view class="share-hint-icon"><text>🤝</text></view>
        <view class="share-hint-info">
          <text class="share-hint-title">一家吃不完 · 两三家拼一头</text>
          <text class="share-hint-sub">主认领人发邀请,大家共看共养 ›</text>
        </view>
      </view>

      <!-- ========== 喂养 + 健康 时间线 ========== -->
      <view class="timeline-section">
        <view class="timeline-tabs">
          <view :class="['tl-tab', activeTab === 'all' && 'tl-tab-on']" @tap="activeTab = 'all'">
            <text>全部 · {{ timeline.length }}</text>
          </view>
          <view :class="['tl-tab', activeTab === 'feeding' && 'tl-tab-on']" @tap="activeTab = 'feeding'">
            <text>🍚 喂养 · {{ feedingCount }}</text>
          </view>
          <view :class="['tl-tab', activeTab === 'health' && 'tl-tab-on']" @tap="activeTab = 'health'">
            <text>💊 健康 · {{ healthCount }}</text>
          </view>
        </view>

        <view v-if="filteredTimeline.length === 0" class="tl-empty">
          <text>暂无记录</text>
        </view>

        <view v-else class="tl-list">
          <view
            v-for="(ev, idx) in filteredTimeline"
            :key="ev.kind + ev.at + idx"
            :class="['tl-item', 'tl-item-' + ev.kind]"
          >
            <view class="tl-dot">
              <text>{{ ev.kind === 'feeding' ? '🍚' : '💊' }}</text>
            </view>
            <view class="tl-content">
              <view class="tl-head">
                <text class="tl-title">{{ ev.title }}</text>
                <text class="tl-time">{{ relativeTime(ev.at) }}</text>
              </view>
              <text class="tl-detail">{{ ev.detail }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer"></view>

      <!-- ========== 底部固定 CTA ========== -->
      <view class="cta-bar">
        <view class="cta-price">
          <text class="cta-price-yuan">¥</text>
          <text class="cta-price-num">{{ Math.round(parseFloat(pig.pricePerShare)) }}</text>
          <text class="cta-price-unit">/份</text>
        </view>
        <view class="cta-btn" :class="pig.status === 'sold_out' && 'cta-btn-disabled'" @tap="onOrder">
          <text>{{ pig.status === 'sold_out' ? '已 售 罄' : '立 即 认 养' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface FarmerBriefFull {
  id: string;
  name: string;
  region: string;
  avatarUrl: string;
  years: number;
  story: string | null;
}
interface PigDetail {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
  pricePerShare: string;
  totalShares: number;
  soldShares: number;
  status: string;
  description: string | null;
  weightKg: string;
  expectedWeightKg: string;
  mockVideoUrl: string;
  listedAt: string | null;
  farmer: FarmerBriefFull | null;
}
interface TimelineEvent {
  kind: 'feeding' | 'health';
  at: string;
  title: string;
  detail: string;
  imageUrl: string;
}

const pig = ref<PigDetail | null>(null);
const timeline = ref<TimelineEvent[]>([]);
const loading = ref(true);
const errMsg = ref('');
const activeTab = ref<'all' | 'feeding' | 'health'>('all');
const liveViewers = ref(0);

const progressPct = computed(() => {
  if (!pig.value || !pig.value.totalShares) return 0;
  return Math.min(100, Math.round((pig.value.soldShares / pig.value.totalShares) * 100));
});

const feedingCount = computed(() => timeline.value.filter((e) => e.kind === 'feeding').length);
const healthCount = computed(() => timeline.value.filter((e) => e.kind === 'health').length);
const filteredTimeline = computed(() => {
  if (activeTab.value === 'all') return timeline.value;
  return timeline.value.filter((e) => e.kind === activeTab.value);
});

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const min = Math.floor((now - t) / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w} 周前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

async function loadDetail(id: string) {
  loading.value = true;
  errMsg.value = '';
  try {
    const [d, tl] = await Promise.all([
      request<PigDetail>(`/pigs/${id}`, { auth: false }),
      request<TimelineEvent[]>(`/pigs/${id}/timeline`, { auth: false }),
    ]);
    pig.value = d;
    timeline.value = tl;
    // mock 在线人数
    liveViewers.value = 60 + Math.floor(Math.random() * 200);
    if (d.title) {
      uni.setNavigationBarTitle({ title: d.title });
    }
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    loading.value = false;
  }
}

function onPlayVideo() {
  if (!pig.value) return;
  uni.navigateTo({ url: `/pages/live/index?pigId=${pig.value.id}` });
}

function goFarmer() {
  if (!pig.value?.farmer?.id) return;
  uni.navigateTo({ url: `/pages/farmer/detail?id=${pig.value.farmer.id}` });
}

function onOrder() {
  if (!pig.value) return;
  if (pig.value.status === 'sold_out') {
    uni.showToast({ title: '已售罄,看看其他猪', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/order/confirm?pigId=${pig.value.id}` });
}

function onShareHint() {
  uni.showToast({ title: '拼猪邀请(S5 实现)', icon: 'none' });
}

onLoad((opts: Record<string, string | undefined>) => {
  const id = opts?.id;
  if (!id) {
    errMsg.value = '缺少 id 参数';
    loading.value = false;
    return;
  }
  loadDetail(id);
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  /* 给底部固定 CTA 留位置 */
  padding-bottom: calc(180rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.loading-state, .error-state {
  padding: 200rpx 0;
  text-align: center;
}
.loading-state text { color: #999; font-size: 28rpx; }
.error-state text { color: #c0392b; font-size: 26rpx; }

/* ============================================================
   封面 + 直播 badge
   ============================================================ */
.cover-wrap {
  position: relative;
  width: 100%;
  height: 560rpx;
  overflow: hidden;
}
.cover-img {
  width: 100%;
  height: 100%;
  background: #ddd;
}
.cover-gradient {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.55) 100%);
  pointer-events: none;
}
.live-badge {
  position: absolute;
  top: 28rpx; left: 28rpx;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  padding: 10rpx 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(255, 75, 43, 0.35);
  z-index: 2;
}
.live-badge text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}
.live-pulse {
  width: 12rpx; height: 12rpx;
  background: #fff;
  border-radius: 50%;
  margin-right: 10rpx;
}
.play-btn {
  position: absolute;
  top: 50%; left: 50%;
  margin: -56rpx 0 0 -56rpx;
  width: 112rpx; height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 216, 156, 0.30);
  border: 4rpx solid rgba(255, 255, 255, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
}
.play-btn-icon { font-size: 48rpx; color: #fff; }
.cover-stat {
  position: absolute;
  bottom: 24rpx; left: 28rpx;
  z-index: 2;
}
.cover-stat text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.5);
}

/* ============================================================
   基础信息卡
   ============================================================ */
.info-card {
  margin: -32rpx 32rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 36rpx;
  position: relative;
  z-index: 3;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}
.info-tags {
  display: flex;
  margin-bottom: 20rpx;
}
.tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  font-size: 20rpx;
  margin-right: 12rpx;
  font-weight: 600;
}
.tag-breed { background: #f0e8d4; color: #7a1f1f; }
.tag-region { background: #e8f0e2; color: #3a6d3a; }
.tag-soldout { background: #fde8e7; color: #c0392b; }

.info-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
  margin-bottom: 16rpx;
  letter-spacing: 1rpx;
}
.info-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.7;
  display: block;
  margin-bottom: 32rpx;
}

.info-stats {
  display: flex;
  background: #faf6ec;
  border-radius: 20rpx;
  padding: 24rpx 0;
  margin-bottom: 32rpx;
}
.info-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.info-stat-divider {
  width: 2rpx;
  background: rgba(192, 57, 43, 0.18);
  margin: 8rpx 0;
}
.info-stat-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #c0392b;
}
.info-stat-label {
  font-size: 20rpx;
  color: #999;
  margin-top: 6rpx;
  letter-spacing: 1rpx;
}

.progress-row {
  display: flex;
  align-items: center;
}
.progress-bar {
  flex: 1;
  height: 12rpx;
  background: #eee;
  border-radius: 6rpx;
  overflow: hidden;
  margin-right: 16rpx;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #c0392b 0%, #e67e22 100%);
}
.progress-text {
  font-size: 22rpx;
  color: #888;
}

/* ============================================================
   农户卡
   ============================================================ */
.section-title {
  display: block;
  text-align: center;
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: #c0392b;
  font-weight: 700;
  margin-bottom: 20rpx;
}
.farmer-card {
  margin: 28rpx 32rpx 0;
  background: linear-gradient(135deg, #FFF8EE, #f5e9d4);
  border-radius: 32rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(192, 57, 43, 0.12);
}
.farmer-row {
  display: flex;
  align-items: center;
}
.farmer-avatar {
  width: 96rpx; height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0392b, #e67e22);
  margin-right: 24rpx;
  flex-shrink: 0;
}
.farmer-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.farmer-name {
  font-size: 32rpx;
  font-weight: 800;
  color: #1a1a1a;
}
.farmer-sub {
  display: flex;
  margin-top: 6rpx;
}
.farmer-region, .farmer-years {
  font-size: 24rpx;
  color: #666;
}
.farmer-star {
  font-size: 26rpx;
  color: #FF9800;
  font-weight: 700;
}
.farmer-arrow {
  font-size: 36rpx;
  color: #c0392b;
  margin-left: 12rpx;
}
.farmer-story {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #5a2818;
  line-height: 1.75;
  background: rgba(255, 255, 255, 0.55);
  padding: 20rpx 24rpx;
  border-left: 6rpx solid #c0392b;
  border-radius: 0 16rpx 16rpx 0;
  display: block;
}

/* ============================================================
   拼猪提示
   ============================================================ */
.share-hint {
  margin: 28rpx 32rpx 0;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(192, 57, 43, 0.25);
}
.share-hint-icon {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin-right: 20rpx;
}
.share-hint-icon text { font-size: 40rpx; }
.share-hint-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.share-hint-title {
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.share-hint-sub {
  color: rgba(255, 255, 255, 0.85);
  font-size: 22rpx;
  margin-top: 4rpx;
}

/* ============================================================
   时间线
   ============================================================ */
.timeline-section {
  margin: 44rpx 32rpx 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx 28rpx 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}
.timeline-tabs {
  display: flex;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid #f0e8d4;
}
.tl-tab {
  padding: 16rpx 0;
  margin-right: 32rpx;
  position: relative;
}
.tl-tab text {
  font-size: 26rpx;
  color: #999;
  font-weight: 600;
}
.tl-tab-on text {
  color: #c0392b;
  font-weight: 800;
}
.tl-tab-on::after {
  content: '';
  position: absolute;
  bottom: -2rpx; left: 0; right: 0;
  height: 4rpx;
  background: #c0392b;
  border-radius: 2rpx;
}

.tl-empty {
  padding: 60rpx 0;
  text-align: center;
}
.tl-empty text {
  color: #bbb;
  font-size: 26rpx;
}

.tl-list {
  display: flex;
  flex-direction: column;
}
.tl-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 0;
  border-bottom: 2rpx dashed #f0e8d4;
}
.tl-item:last-child {
  border-bottom: none;
}
.tl-dot {
  width: 56rpx; height: 56rpx;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
  border: 2rpx solid rgba(192, 57, 43, 0.18);
  background: #fff;
}
.tl-dot text {
  font-size: 28rpx;
}
.tl-item-health .tl-dot {
  background: linear-gradient(135deg, #FFF5F0, #FFE4D6);
  border-color: rgba(192, 57, 43, 0.32);
}
.tl-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.tl-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.tl-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.tl-time {
  font-size: 22rpx;
  color: #999;
}
.tl-detail {
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
  margin-top: 8rpx;
}

.bottom-spacer { height: 32rpx; }

/* ============================================================
   底部固定 CTA
   ============================================================ */
.cta-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-top: 2rpx solid #f0e8d4;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  z-index: 100;
}
.cta-price {
  display: flex;
  align-items: baseline;
  margin-right: 24rpx;
}
.cta-price-yuan { font-size: 28rpx; color: #c0392b; font-weight: 700; }
.cta-price-num { font-size: 48rpx; color: #c0392b; font-weight: 800; }
.cta-price-unit { font-size: 22rpx; color: #999; margin-left: 4rpx; }
.cta-btn {
  flex: 1;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 48rpx;
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
.cta-btn-disabled {
  background: #ccc;
  box-shadow: none;
}
</style>
