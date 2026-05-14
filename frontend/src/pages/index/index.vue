<template>
  <view class="page">
    <!-- ========== Hero 沉浸式英雄区 ========== -->
    <view class="hero-wrap">
      <view class="hero-bg-glow1"></view>
      <view class="hero-bg-glow2"></view>
      <text class="hero-lantern l1">🏮</text>
      <text class="hero-lantern l2">🏮</text>

      <view class="hero-top">
        <text class="hero-brand" @tap="todo('关于我们')">私 人 订 猪</text>
        <view class="hero-top-right">
          <view class="btn-foster" @tap="goFoster">
            <text class="btn-foster-text">代养人端</text>
          </view>
          <view class="hero-bell" @tap="goMessages">
            <text class="hero-bell-icon">🔔</text>
            <view class="hero-bell-dot"></view>
          </view>
        </view>
      </view>

      <view class="hero-eyebrow-wrap">
        <text class="hero-eyebrow">— 找 回 小 时 候 的 年 味 —</text>
      </view>

      <view class="hero-h1">
        <text class="hero-h1-line">认一头猪</text>
        <text class="hero-h1-line hero-h1-em">过一个年</text>
      </view>

      <view class="hero-tagline">
        <text class="hero-tag-line">城里没有的年味,我们在山里替你养着</text>
        <text class="hero-tag-line">10–12 个月慢养土猪 · <text class="tag-highlight">正 好 一 头 年 猪</text></text>
      </view>

      <view class="countdown" @tap="todo('腊月倒计时')">
        <text class="countdown-icon">🏮</text>
        <view class="countdown-text">
          <text class="countdown-t1">距 离 腊 月 二 十 三</text>
          <view class="countdown-t2">
            <text>还有 </text><text class="countdown-num">259</text><text> 天 · 现在认养正好赶上过年</text>
          </view>
        </view>
        <text class="countdown-arrow">›</text>
      </view>

      <view class="hero-cta-row">
        <view class="hero-cta primary" @tap="goFirstPig"><text>立 即 认 养</text></view>
        <view class="hero-cta ghost" @tap="goFirstLive"><text>🎥 看实景直播</text></view>
      </view>
    </view>

    <!-- ========== 三大主张横滑 ========== -->
    <view class="sec-title-pro">
      <view class="stp-l">
        <text class="stp-eyebrow">— 我 们 不 一 样 —</text>
        <text class="stp-title">三件事 · 决定你能不能放心</text>
      </view>
      <text class="stp-r" @tap="todo('详情')">详情 ›</text>
    </view>
    <scroll-view class="value-row" scroll-x :show-scrollbar="false">
      <view class="value-card v1" @tap="todo('商业模式')">
        <view>
          <text class="vc-tag">商 业 模 式</text>
          <view class="vc-icon"><text>🛡️</text></view>
          <view class="vc-title">
            <text>不卖肉</text><text>只替你养</text>
          </view>
        </view>
        <view class="vc-desc">
          <text>猪从认领第一天就是你的</text><text>我们没动机给它喂催肥料</text>
        </view>
      </view>
      <view class="value-card v2" @tap="todo('家乡仪式')">
        <view>
          <text class="vc-tag">家 乡 仪 式</text>
          <view class="vc-icon"><text>🍲</text></view>
          <view class="vc-title">
            <text>村口大锅</text><text>过年杀猪饭</text>
          </view>
        </view>
        <view class="vc-desc">
          <text>川北山区散养土猪</text><text>腊月你的猪你做主</text>
        </view>
      </view>
      <view class="value-card v3" @tap="todo('全程透明')">
        <view>
          <text class="vc-tag">全 程 透 明</text>
          <view class="vc-icon"><text>📹</text></view>
          <view class="vc-title">
            <text>24h 直播</text><text>每餐都打卡</text>
          </view>
        </view>
        <view class="vc-desc">
          <text>从满月到上桌</text><text>每一天你都看得见</text>
        </view>
      </view>
    </scroll-view>

    <!-- ========== 直播 + 农户混排 ========== -->
    <view class="sec-title-pro">
      <view class="stp-l">
        <text class="stp-eyebrow">— 此 刻 在 山 里 —</text>
        <text class="stp-title">看一眼你认下的那头猪</text>
      </view>
      <text class="stp-r" @tap="todo('全部直播')">全部直播 ›</text>
    </view>
    <view class="live-mix">
      <view class="live-mix-left" @tap="todo('直播')">
        <view class="lm-bg-glow"></view>
        <view class="lm-badge">
          <view class="lm-pulse"></view>
          <text>LIVE</text>
        </view>
        <view class="lm-play"><text>▶</text></view>
        <view class="lm-info">
          <text class="lm-info-t">张大爷的猪圈 · 四川广元</text>
          <text class="lm-info-b">128 人正在观看</text>
        </view>
      </view>
      <view class="live-mix-right">
        <view class="farmer-mini" @tap="goFarmerPig('广元')">
          <view class="farmer-mini-av"><text>👨‍🌾</text></view>
          <view class="farmer-mini-info">
            <text class="farmer-mini-name">广元农户</text>
            <text class="farmer-mini-loc">四川广元</text>
            <text class="farmer-mini-star">★ 4.9 · 散养 15 年</text>
          </view>
        </view>
        <view class="farmer-mini" @tap="goFarmerPig('绵阳')">
          <view class="farmer-mini-av"><text>👩‍🌾</text></view>
          <view class="farmer-mini-info">
            <text class="farmer-mini-name">绵阳农户</text>
            <text class="farmer-mini-loc">四川绵阳</text>
            <text class="farmer-mini-star">★ 4.8 · 散养 18 年</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 4 步流程时间线 ========== -->
    <view class="flow-section">
      <text class="flow-title">从认领到上桌 · 走过这 4 步</text>
      <text class="flow-sub">— 养 满 一 年  ·  一 头 你 的 年 猪 —</text>
      <view class="flow-line">
        <view class="flow-line-dash"></view>
        <view class="flow-step on">
          <view class="flow-step-ic"><text>🐷</text></view>
          <text class="flow-step-tx">认领猪仔</text>
        </view>
        <view class="flow-step">
          <view class="flow-step-ic"><text>📹</text></view>
          <text class="flow-step-tx">直播看养</text>
        </view>
        <view class="flow-step">
          <view class="flow-step-ic"><text>🔥</text></view>
          <text class="flow-step-tx">腊月出栏</text>
        </view>
        <view class="flow-step">
          <view class="flow-step-ic"><text>🥩</text></view>
          <text class="flow-step-tx">送到家</text>
        </view>
      </view>
    </view>

    <!-- ========== 拼猪 ========== -->
    <view class="share-section">
      <view class="share-deco"><text>🤝</text></view>

      <text class="share-eb">— 一 家 吃 不 完 ? —</text>
      <view class="share-h">
        <text>拼 猪 · </text><text class="share-h-em">两三家分一头</text>
      </view>
      <view class="share-sub">
        <text>一头土猪 150–180 斤,一家未必吃得完</text>
        <text>约几家亲戚朋友合伙,正合适</text>
      </view>

      <view class="share-tier">
        <view class="share-card">
          <text class="share-tier-people">👤</text>
          <text class="share-tier-name">一家独养</text>
          <text class="share-tier-desc">整 猪 自 留</text>
        </view>
        <view class="share-card active">
          <view class="share-card-badge"><text>推 荐</text></view>
          <text class="share-tier-people">👤 👤</text>
          <text class="share-tier-name">两家拼猪</text>
          <text class="share-tier-desc">一 家 半 猪</text>
        </view>
        <view class="share-card">
          <text class="share-tier-people">👤👤👤</text>
          <text class="share-tier-name">三家拼猪</text>
          <text class="share-tier-desc">各 分 一 份</text>
        </view>
      </view>

      <view class="share-flow">
        <view class="share-flow-row">
          <view class="share-flow-num"><text>1</text></view>
          <text class="share-flow-text"><text class="hl">主认领人</text>下单一头猪</text>
        </view>
        <view class="share-flow-row">
          <view class="share-flow-num"><text>2</text></view>
          <text class="share-flow-text">生成<text class="hl">专属分享码</text>,发给亲朋好友</text>
        </view>
        <view class="share-flow-row">
          <view class="share-flow-num"><text>3</text></view>
          <text class="share-flow-text">受邀人凭码加入,<text class="hl">同看一头猪</text>:直播 / 喂养记录 / 健康档案全部开放</text>
        </view>
        <view class="share-flow-row">
          <view class="share-flow-num"><text>4</text></view>
          <text class="share-flow-text">腊月出栏,主认领人收货,<text class="hl">怎么分肉自家商量</text></text>
        </view>
      </view>

      <view class="share-tip">
        <text>💡 <text class="bold">关于钱和肉:</text>每位拼猪人 AA 多少、最后怎么分肉、谁来取猪——<text class="bold">这些都你们自家商量</text>。平台只负责把猪养好、把肉送到主认领人手里,<text class="bold">不参与、不抽成</text>。</text>
      </view>

      <view class="share-cta" @tap="todo('发起拼猪')"><text>🤝  发 起 拼 猪  →</text></view>
    </view>

    <!-- ========== 挑你的猪(真实数据) ========== -->
    <view class="sec-title-pro">
      <view class="stp-l">
        <text class="stp-eyebrow">— 挑 一 头 你 的 猪 —</text>
        <text class="stp-title">{{ list.length }} 头慢养土猪 · 任选</text>
      </view>
      <text class="stp-r" @tap="todo('查看全部')">查看全部 ›</text>
    </view>
    <view v-if="loading" class="loading-state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="error-state"><text>{{ errMsg }}</text></view>
    <scroll-view v-else class="breed-row" scroll-x :show-scrollbar="false">
      <view v-for="(p, i) in list" :key="p.id" class="breed-card" @tap="onPigTap(p)">
        <image class="breed-cover" :src="p.coverImage" mode="aspectFill" />
        <text class="breed-name">{{ p.title }}</text>
        <text class="breed-attr">{{ p.breed }} · 约 1 年出栏</text>
        <view class="breed-price">
          <text class="breed-price-yuan">¥</text>
          <text class="breed-price-num">{{ priceInt(p.pricePerShare) }}</text>
          <text class="breed-price-unit"> /份</text>
        </view>
        <text class="breed-tag">{{ tagFor(p, i) }}</text>
      </view>
    </scroll-view>

    <!-- ========== 关于我们入口 ========== -->
    <view class="about-entry-pro" @tap="goAbout">
      <view class="aep-deco"><text>🏮</text></view>
      <view class="aep-info">
        <text class="aep-eb">— 关 于 我 们 —</text>
        <text class="aep-h">认一头猪 · 过一个年</text>
        <text class="aep-d">为什么我们做的不是肉,是仪式 ›</text>
      </view>
      <text class="aep-arrow">›</text>
    </view>

    <!-- ========== 信任带 ========== -->
    <view class="trust-bar">
      <view class="trust-bar-deco"><text>🏮  🏮</text></view>
      <view class="trust-item">
        <text class="trust-num">1,234</text>
        <text class="trust-label">服 务 客 户</text>
      </view>
      <view class="trust-item trust-item-divider">
        <text class="trust-num">567</text>
        <text class="trust-label">正 在 代 养</text>
      </view>
      <view class="trust-item trust-item-divider">
        <text class="trust-num">89</text>
        <text class="trust-label">合 作 农 户</text>
      </view>
    </view>

    <!-- ========== 底部 CTA ========== -->
    <view class="home-bottom-cta" @tap="todo('认一头猪')"><text>🐷  认 一 头 你 的 猪</text></view>

    <view class="bottom-spacer"></view>

    <!-- ========== Tabbar(页面内假版,S5 配真路由 tabbar)========== -->
    <view class="tabbar">
      <view class="tabbar-item">
        <text class="tabbar-icon on">🏠</text>
        <text class="tabbar-text on">首页</text>
      </view>
      <view class="tabbar-item" @tap="todo('订猪 Tab')">
        <text class="tabbar-icon">🐷</text>
        <text class="tabbar-text">订猪</text>
      </view>
      <view class="tabbar-item" @tap="goMyPigs">
        <text class="tabbar-icon">🐽</text>
        <text class="tabbar-text">我的猪圈</text>
      </view>
      <view class="tabbar-item" @tap="goMy">
        <text class="tabbar-icon">👤</text>
        <text class="tabbar-text">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { request, ApiError } from '../../utils/request';

interface FarmerBrief {
  id: string;
  name: string;
  region: string;
  avatarUrl: string;
}
interface PigCard {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
  pricePerShare: string;
  totalShares: number;
  soldShares: number;
  status: string;
  farmer: FarmerBrief | null;
}
interface PigListResp {
  items: PigCard[];
  total: number;
  page: number;
  pageSize: number;
}

const list = ref<PigCard[]>([]);
const loading = ref(true);
const errMsg = ref('');

function priceInt(p: string): string {
  // "830.00" -> "830"; 整数显示更利落
  const n = parseFloat(p);
  return Number.isFinite(n) ? String(Math.round(n)) : p;
}

function tagFor(p: PigCard, i: number): string {
  const remain = p.totalShares - p.soldShares;
  if (remain <= 2) return `⚡ 仅剩 ${remain} 份`;
  if (i === 0) return '🔥 热销首选';
  if (p.region === '广元') return '🏔️ 川北山区';
  if (p.region === '绵阳') return '🌾 海拔 1800';
  return '🥩 慢养土猪';
}

function todo(name: string) {
  // 根据功能名称做实际路由，非关键的显示提示
  if (name.includes('农户')) {
    // 跳到首个匹配的农户猪详情
    const first = list.value[0];
    if (first) uni.navigateTo({ url: `/pages/pig/detail?id=${first.id}` });
    else uni.showToast({ title: '暂无猪只数据', icon: 'none' });
  } else if (name.includes('发起拼猪')) {
    const first = list.value[0];
    if (first) uni.navigateTo({ url: `/pages/pig/detail?id=${first.id}` });
    else uni.showToast({ title: '请先认领一头猪', icon: 'none' });
  } else if (name.includes('查看全部') || name.includes('认一头猪') || name.includes('订猪')) {
    // 滚动到猪列表区域，或直接跳到第一头猪
    const first = list.value[0];
    if (first) uni.navigateTo({ url: `/pages/pig/detail?id=${first.id}` });
    else uni.showToast({ title: '暂无在售猪只', icon: 'none' });
  } else if (name.includes('直播')) {
    goFirstLive();
  } else {
    uni.showToast({ title: name, icon: 'none', duration: 1200 });
  }
}

function goMy() {
  uni.navigateTo({ url: '/pages/my/index' });
}

function goMessages() {
  uni.navigateTo({ url: '/pages/messages/index' });
}

function goFoster() {
  uni.navigateTo({ url: '/pages/foster/login/index' });
}

function goMyPigs() {
  uni.navigateTo({ url: '/pages/my/pigs' });
}

function goAbout() {
  uni.navigateTo({ url: '/pages/static/about' });
}

/** 取列表第一头猪,跳详情(立即认养 CTA 用) */
function goFirstPig() {
  const first = list.value[0];
  if (first) {
    uni.navigateTo({ url: `/pages/pig/detail?id=${first.id}` });
  } else {
    uni.showToast({ title: '猪还没上架', icon: 'none' });
  }
}

/** 取列表第一头猪的直播 */
function goFirstLive() {
  const first = list.value[0];
  if (first) {
    uni.navigateTo({ url: `/pages/live/index?pigId=${first.id}` });
  } else {
    uni.showToast({ title: '没有可看的直播', icon: 'none' });
  }
}

function onPigTap(p: PigCard) {
  uni.navigateTo({ url: `/pages/pig/detail?id=${p.id}` });
}

function goFarmerPig(region: string) {
  // 找该地区的第一头猪跳转详情
  const pig = list.value.find(p => p.region === region) || list.value[0];
  if (pig) uni.navigateTo({ url: `/pages/pig/detail?id=${pig.id}` });
  else uni.showToast({ title: '该地区暂无在售猪只', icon: 'none' });
}

async function loadList() {
  loading.value = true;
  errMsg.value = '';
  try {
    const data = await request<PigListResp>('/pigs?pageSize=20', { auth: false });
    list.value = data.items;
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadList);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  /* 给底部 fixed Tabbar 留位置 + iPhone Home Indicator 安全区 */
  padding-bottom: calc(160rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* ============================================================
   Hero 沉浸式英雄区
   ============================================================ */
.hero-wrap {
  position: relative;
  background: linear-gradient(165deg, #2c1810 0%, #5a2818 45%, #8b3a1a 100%);
  padding: 100rpx 40rpx 48rpx;
  overflow: hidden;
}
.hero-bg-glow1, .hero-bg-glow2 {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}
.hero-bg-glow1 {
  background: radial-gradient(circle at 18% 22%, rgba(255, 200, 100, 0.2) 0%, transparent 55%);
}
.hero-bg-glow2 {
  background: radial-gradient(circle at 88% 78%, rgba(255, 80, 40, 0.2) 0%, transparent 55%);
}
.hero-lantern {
  position: absolute;
  font-size: 72rpx;
  opacity: 0.6;
  pointer-events: none;
}
.hero-lantern.l1 { top: 112rpx; right: 44rpx; }
.hero-lantern.l2 { top: 192rpx; right: 140rpx; font-size: 48rpx; opacity: 0.42; }

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}
.hero-brand {
  font-size: 36rpx;
  font-weight: 800;
  color: #ffd89c;
  letter-spacing: 6rpx;
}
.hero-top-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.btn-foster {
  background: rgba(45, 138, 78, 0.85);
  border-radius: 30rpx;
  padding: 10rpx 24rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
}
.btn-foster-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
  letter-spacing: 2rpx;
}
.hero-bell {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.10);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.hero-bell-icon {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.85);
}
.hero-bell-dot {
  position: absolute;
  top: 16rpx; right: 16rpx;
  width: 14rpx; height: 14rpx;
  background: #ff5252;
  border-radius: 50%;
  box-shadow: 0 0 0 4rpx #5a2818;
}

.hero-eyebrow-wrap {
  margin-top: 56rpx;
  position: relative;
  z-index: 2;
}
.hero-eyebrow {
  display: inline-block;
  background: rgba(255, 220, 160, 0.18);
  color: #ffd89c;
  padding: 10rpx 28rpx;
  border-radius: 40rpx;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
}

.hero-h1 {
  margin-top: 28rpx;
  position: relative;
  z-index: 2;
  color: #fff;
  display: flex;
  flex-direction: column;
  line-height: 1.18;
  text-shadow: 0 8rpx 36rpx rgba(0, 0, 0, 0.35);
}
.hero-h1-line {
  font-size: 76rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
}
.hero-h1-em { color: #ffd89c; }

.hero-tagline {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.78);
  margin-top: 24rpx;
  line-height: 1.8;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}
.hero-tag-line { display: block; }
.tag-highlight { color: #ffd89c; font-weight: 700; }

.countdown {
  margin-top: 36rpx;
  background: rgba(255, 255, 255, 0.10);
  border: 2rpx solid rgba(255, 220, 160, 0.28);
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 2;
}
.countdown-icon { font-size: 52rpx; margin-right: 24rpx; }
.countdown-text { flex: 1; }
.countdown-t1 {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 4rpx;
  display: block;
}
.countdown-t2 {
  font-size: 26rpx;
  color: #ffd89c;
  font-weight: 600;
  margin-top: 6rpx;
}
.countdown-num {
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
  margin: 0 8rpx;
}
.countdown-arrow {
  font-size: 40rpx;
  color: #ffd89c;
  margin-left: 16rpx;
}

.hero-cta-row {
  display: flex;
  margin-top: 36rpx;
  position: relative;
  z-index: 2;
}
.hero-cta {
  flex: 1;
  height: 96rpx;
  border-radius: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
.hero-cta + .hero-cta { margin-left: 20rpx; }
.hero-cta.primary {
  background: linear-gradient(135deg, #ffd89c, #ff9e3d);
  color: #2c1810;
  box-shadow: 0 16rpx 44rpx rgba(255, 158, 61, 0.4);
}
.hero-cta.ghost {
  background: rgba(255, 255, 255, 0.10);
  color: #fff;
  border: 2rpx solid rgba(255, 255, 255, 0.28);
}

/* ============================================================
   sec-title-pro (区块标题)
   ============================================================ */
.sec-title-pro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 48rpx 36rpx 24rpx;
}
.stp-l {
  display: flex;
  flex-direction: column;
}
.stp-eyebrow {
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: #c0392b;
  font-weight: 700;
}
.stp-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #1a1a1a;
  margin-top: 6rpx;
}
.stp-r {
  font-size: 24rpx;
  color: #888;
}

/* ============================================================
   三大主张
   ============================================================ */
.value-row {
  display: flex;
  padding: 8rpx 32rpx 12rpx;
  white-space: nowrap;
}
.value-card {
  display: inline-flex;
  vertical-align: top;
  width: 400rpx;
  flex-shrink: 0;
  border-radius: 32rpx;
  padding: 32rpx;
  min-height: 288rpx;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  white-space: normal;
}
.value-card + .value-card { margin-left: 20rpx; }
.value-card.v1 {
  background: linear-gradient(135deg, #FFF5F0 0%, #FFE4D6 100%);
  border: 2rpx solid rgba(192, 57, 43, 0.15);
}
.value-card.v2 {
  background: linear-gradient(135deg, #2c1810, #5a2818);
}
.value-card.v3 {
  background: linear-gradient(135deg, #1a4a3a, #2d6a4f);
}
.vc-tag {
  display: inline-block;
  font-size: 20rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  letter-spacing: 2rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.value-card.v1 .vc-tag { background: rgba(192, 57, 43, 0.12); color: #c0392b; }
.value-card.v2 .vc-tag { background: rgba(255, 216, 156, 0.18); color: #ffd89c; }
.value-card.v3 .vc-tag { background: rgba(255, 255, 255, 0.18); color: #ffd89c; }
.vc-icon { font-size: 60rpx; margin-bottom: 12rpx; line-height: 1; }
.vc-title {
  display: flex;
  flex-direction: column;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 1rpx;
}
.value-card.v1 .vc-title { color: #c0392b; }
.value-card.v2 .vc-title, .value-card.v3 .vc-title { color: #fff; }
.vc-desc {
  display: flex;
  flex-direction: column;
  font-size: 24rpx;
  line-height: 1.65;
  margin-top: 16rpx;
  opacity: 0.78;
}
.value-card.v1 .vc-desc { color: #1a1a1a; }
.value-card.v2 .vc-desc, .value-card.v3 .vc-desc { color: #fff; }

/* ============================================================
   直播 + 农户混排
   ============================================================ */
.live-mix {
  margin: 8rpx 32rpx 8rpx;
  display: flex;
  height: 392rpx;
}
.live-mix-left {
  flex: 1.5;
  margin-right: 20rpx;
  border-radius: 32rpx;
  background: linear-gradient(160deg, #0f2027 0%, #2c1810 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  padding: 24rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.18);
}
.lm-bg-glow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    radial-gradient(circle at 30% 50%, rgba(255, 158, 61, 0.22), transparent 60%),
    radial-gradient(circle at 75% 30%, rgba(192, 57, 43, 0.20), transparent 55%);
  pointer-events: none;
}
.lm-badge {
  position: absolute;
  top: 24rpx; left: 24rpx;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  color: #fff;
  padding: 8rpx 20rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  z-index: 2;
}
.lm-pulse {
  width: 12rpx; height: 12rpx;
  background: #fff;
  border-radius: 50%;
  margin-right: 10rpx;
}
.lm-play {
  position: absolute;
  top: 50%; left: 50%;
  margin: -56rpx 0 0 -56rpx;
  width: 112rpx; height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 216, 156, 0.22);
  border: 4rpx solid rgba(255, 216, 156, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
}
.lm-play text { font-size: 44rpx; color: #fff; }
.lm-info {
  color: #fff;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}
.lm-info-t { font-size: 22rpx; opacity: 0.75; letter-spacing: 1rpx; }
.lm-info-b { font-size: 26rpx; font-weight: 700; margin-top: 6rpx; }

.live-mix-right {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.farmer-mini {
  flex: 1;
  background: linear-gradient(135deg, #FFF8EE, #f5e9d4);
  border-radius: 28rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  border: 2rpx solid rgba(192, 57, 43, 0.10);
}
.farmer-mini + .farmer-mini { margin-top: 16rpx; }
.farmer-mini-av {
  width: 76rpx; height: 76rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0392b, #e67e22);
  display: flex; align-items: center; justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.farmer-mini-av text { font-size: 40rpx; }
.farmer-mini-info { flex: 1; display: flex; flex-direction: column; }
.farmer-mini-name { font-size: 26rpx; font-weight: 700; color: #1a1a1a; }
.farmer-mini-loc { font-size: 22rpx; color: #999; margin-top: 2rpx; }
.farmer-mini-star { font-size: 20rpx; color: #FF9800; margin-top: 4rpx; }

/* ============================================================
   4 步流程
   ============================================================ */
.flow-section {
  margin: 44rpx 32rpx 8rpx;
  background: linear-gradient(135deg, #FFF8EE, #fff);
  border-radius: 36rpx;
  padding: 36rpx 24rpx 40rpx;
  border: 2rpx solid rgba(192, 57, 43, 0.10);
  box-shadow: 0 4rpx 24rpx rgba(192, 57, 43, 0.04);
}
.flow-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1a1a1a;
  text-align: center;
  letter-spacing: 2rpx;
  display: block;
}
.flow-sub {
  font-size: 20rpx;
  color: #c0392b;
  text-align: center;
  margin: 8rpx 0 36rpx;
  letter-spacing: 8rpx;
  font-weight: 700;
  display: block;
}
.flow-line {
  display: flex;
  justify-content: space-between;
  position: relative;
  padding: 0 12rpx;
}
.flow-line-dash {
  position: absolute;
  left: 60rpx; right: 60rpx; top: 44rpx;
  height: 4rpx;
  background: repeating-linear-gradient(90deg, rgba(192, 57, 43, 0.35) 0 10rpx, transparent 10rpx 20rpx);
}
.flow-step {
  text-align: center;
  flex: 1;
  position: relative;
  z-index: 2;
}
.flow-step-ic {
  width: 88rpx; height: 88rpx;
  background: #fff;
  border: 4rpx solid rgba(192, 57, 43, 0.22);
  border-radius: 50%;
  margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(192, 57, 43, 0.10);
}
.flow-step-ic text { font-size: 44rpx; }
.flow-step.on .flow-step-ic {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-color: #c0392b;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.40);
}
.flow-step-tx {
  font-size: 22rpx;
  color: #666;
  margin-top: 16rpx;
  font-weight: 600;
  display: block;
}
.flow-step.on .flow-step-tx { color: #c0392b; font-weight: 700; }

/* ============================================================
   拼猪
   ============================================================ */
.share-section {
  margin: 44rpx 32rpx 8rpx;
  background: linear-gradient(135deg, #FFF8EE 0%, #fff5e0 50%, #ffe9c7 100%);
  border-radius: 36rpx;
  padding: 44rpx 36rpx 36rpx;
  border: 2rpx solid rgba(192, 57, 43, 0.14);
  position: relative;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(192, 57, 43, 0.06);
}
.share-deco {
  position: absolute;
  top: -16rpx;
  right: 28rpx;
  pointer-events: none;
}
.share-deco text {
  font-size: 128rpx;
  opacity: 0.10;
}
.share-eb {
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: #c0392b;
  font-weight: 700;
  text-align: center;
  display: block;
  margin-bottom: 12rpx;
}
.share-h {
  font-size: 40rpx;
  font-weight: 800;
  color: #1a1a1a;
  text-align: center;
  letter-spacing: 2rpx;
  margin-bottom: 12rpx;
}
.share-h-em { color: #c0392b; }
.share-sub {
  text-align: center;
  margin-bottom: 40rpx;
  display: flex;
  flex-direction: column;
}
.share-sub text {
  font-size: 24rpx;
  color: #888;
  line-height: 1.7;
}

.share-tier {
  display: flex;
  margin-bottom: 36rpx;
}
.share-card {
  flex: 1;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx 12rpx 28rpx;
  text-align: center;
  border: 2rpx solid rgba(192, 57, 43, 0.10);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.share-card + .share-card { margin-left: 16rpx; }
.share-card.active {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-color: #c0392b;
  box-shadow: 0 16rpx 40rpx rgba(192, 57, 43, 0.32);
  transform: translateY(-8rpx);
}
.share-card-badge {
  position: absolute;
  top: -18rpx;
  left: 50%;
  margin-left: -54rpx;
  width: 108rpx;
  background: #ffd89c;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 0;
}
.share-card-badge text {
  font-size: 18rpx;
  color: #2c1810;
  font-weight: 800;
  letter-spacing: 4rpx;
}
.share-tier-people {
  font-size: 44rpx;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
  display: block;
}
.share-tier-name {
  font-size: 26rpx;
  font-weight: 800;
  margin-bottom: 6rpx;
  color: #1a1a1a;
  display: block;
}
.share-card.active .share-tier-name { color: #fff; }
.share-tier-desc {
  font-size: 22rpx;
  opacity: 0.72;
  color: #1a1a1a;
  display: block;
}
.share-card.active .share-tier-desc { color: #fff; opacity: 0.88; }

.share-flow {
  background: rgba(255, 255, 255, 0.65);
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
}
.share-flow-row {
  display: flex;
  align-items: flex-start;
  padding: 10rpx 0;
}
.share-flow-num {
  flex-shrink: 0;
  width: 44rpx; height: 44rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  display: flex; align-items: center; justify-content: center;
  margin-right: 20rpx;
  margin-top: 2rpx;
}
.share-flow-num text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
}
.share-flow-text {
  flex: 1;
  font-size: 26rpx;
  color: #444;
  line-height: 1.65;
}
.share-flow-text .hl { color: #c0392b; font-weight: 700; }

.share-tip {
  background: rgba(192, 57, 43, 0.07);
  border-left: 6rpx solid #c0392b;
  padding: 20rpx 24rpx;
  border-radius: 0 16rpx 16rpx 0;
  margin-bottom: 32rpx;
}
.share-tip text {
  font-size: 24rpx;
  color: #5a2818;
  line-height: 1.75;
}
.share-tip .bold { color: #c0392b; font-weight: 700; }

.share-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 52rpx;
  height: 96rpx;
  box-shadow: 0 16rpx 44rpx rgba(192, 57, 43, 0.36);
}
.share-cta text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
}

/* ============================================================
   挑你的猪(真实数据)
   ============================================================ */
.loading-state, .error-state {
  padding: 60rpx 0;
  text-align: center;
}
.loading-state text { color: #999; font-size: 26rpx; }
.error-state text { color: #c0392b; font-size: 24rpx; }

.breed-row {
  display: flex;
  padding: 8rpx 32rpx 32rpx;
  white-space: nowrap;
}
.breed-card {
  display: inline-flex;
  vertical-align: top;
  flex-direction: column;
  width: 304rpx;
  flex-shrink: 0;
  background: #fff;
  border-radius: 32rpx;
  padding: 28rpx 20rpx 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid #f3e8d9;
  white-space: normal;
}
.breed-card + .breed-card { margin-left: 20rpx; }
.breed-cover {
  width: 128rpx; height: 128rpx;
  border-radius: 50%;
  align-self: center;
  background: linear-gradient(135deg, #FFF5F0, #FFE4D6);
  margin-bottom: 20rpx;
  border: 2rpx solid rgba(192, 57, 43, 0.10);
}
.breed-name {
  text-align: center;
  font-size: 28rpx;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 8rpx;
  display: block;
}
.breed-attr {
  text-align: center;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 16rpx;
  display: block;
}
.breed-price {
  text-align: center;
  margin-bottom: 16rpx;
}
.breed-price-yuan {
  font-size: 28rpx;
  font-weight: 700;
  color: #c0392b;
}
.breed-price-num {
  font-size: 44rpx;
  font-weight: 800;
  color: #c0392b;
}
.breed-price-unit {
  font-size: 20rpx;
  color: #999;
}
.breed-tag {
  display: block;
  text-align: center;
  font-size: 20rpx;
  background: linear-gradient(135deg, #fff5e6, #ffe4ba);
  color: #c0392b;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

/* ============================================================
   关于我们 entry
   ============================================================ */
.about-entry-pro {
  margin: 36rpx 32rpx 0;
  background: linear-gradient(135deg, #FFF8EE, #f5e9d4);
  border-radius: 32rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(192, 57, 43, 0.12);
  display: flex;
  align-items: center;
}
.aep-deco {
  width: 112rpx; height: 112rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #2c1810, #5a2818);
  display: flex; align-items: center; justify-content: center;
  margin-right: 28rpx;
  flex-shrink: 0;
}
.aep-deco text { font-size: 60rpx; }
.aep-info { flex: 1; display: flex; flex-direction: column; }
.aep-eb { font-size: 20rpx; letter-spacing: 6rpx; color: #c0392b; font-weight: 700; display: block; }
.aep-h { font-size: 30rpx; font-weight: 800; color: #1a1a1a; margin-top: 8rpx; letter-spacing: 1rpx; display: block; }
.aep-d { font-size: 24rpx; color: #888; margin-top: 6rpx; display: block; }
.aep-arrow { color: #c0392b; font-size: 40rpx; flex-shrink: 0; }

/* ============================================================
   信任带
   ============================================================ */
.trust-bar {
  margin: 28rpx 32rpx 0;
  background: linear-gradient(135deg, #2c1810, #5a2818);
  border-radius: 32rpx;
  padding: 32rpx 16rpx;
  display: flex;
  position: relative;
  overflow: hidden;
}
.trust-bar-deco {
  position: absolute;
  top: -20rpx;
  right: 24rpx;
}
.trust-bar-deco text {
  font-size: 64rpx;
  opacity: 0.18;
  letter-spacing: 8rpx;
  color: #ffd89c;
}
.trust-item {
  flex: 1;
  text-align: center;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}
.trust-item-divider {
  border-left: 2rpx solid rgba(255, 216, 156, 0.22);
}
.trust-num {
  font-size: 44rpx;
  font-weight: 800;
  color: #ffd89c;
  letter-spacing: 1rpx;
}
.trust-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.68);
  margin-top: 8rpx;
  letter-spacing: 3rpx;
}

/* ============================================================
   底部 CTA
   ============================================================ */
.home-bottom-cta {
  margin: 32rpx 32rpx 0;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 56rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20rpx 56rpx rgba(192, 57, 43, 0.38);
}
.home-bottom-cta text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
}

.bottom-spacer { height: 32rpx; }

/* ============================================================
   Tabbar (页面内假版,S5 配置真路由 tabbar 时移除)
   ============================================================ */
.tabbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-top: 2rpx solid #eee;
  display: flex;
  padding: 12rpx 0 24rpx;
  /* 适配 iPhone X+ 底部 Home Indicator */
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  z-index: 100;
}
.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tabbar-icon {
  font-size: 40rpx;
  color: #999;
}
.tabbar-icon.on { color: #c0392b; }
.tabbar-text {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}
.tabbar-text.on { color: #c0392b; font-weight: 700; }
</style>
