<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <text class="lantern">🏮</text>
      <text class="brand">私 人 订 猪</text>
      <text class="slogan">认 一 头 猪 · 过 一 个 年</text>
      <text class="version">v {{ version }} · build {{ buildTag }}</text>
    </view>

    <!-- 一句话 -->
    <view class="card">
      <text class="card-eyebrow">— 我 们 是 谁 —</text>
      <text class="card-text">
        我们不是卖肉的,是替你养一头猪的人。

川北山区散养农户,10-12 个月慢养土猪,全程 24h 直播 + 每餐打卡。
腊月出栏,把一头你自己认下的年猪送到你家。
      </text>
    </view>

    <!-- 商业逻辑 -->
    <view class="card">
      <text class="card-eyebrow">— 我 们 为 什 么 不 同 —</text>
      <text class="card-text">
        商业模式决定立场。立场决定你能不能放心。

我们的收入来自代养服务费,不来自卖肉数量。所以**我们没动机给你的猪用催肥饲料、抗生素**——这不是因为我们道德高,是因为商业模式逼着我们这么干。

这是结构性的护城河。
      </text>
    </view>

    <!-- 价值主张 -->
    <view class="values">
      <view class="value-card">
        <text class="value-icon">🛡️</text>
        <text class="value-title">不卖肉,只替你养</text>
        <text class="value-text">猪从认领第一天就是你的</text>
      </view>
      <view class="value-card">
        <text class="value-icon">🌾</text>
        <text class="value-title">慢养土猪</text>
        <text class="value-text">10-12 个月 · 粗粮 + 山泉</text>
      </view>
      <view class="value-card">
        <text class="value-icon">📹</text>
        <text class="value-title">全程透明</text>
        <text class="value-text">24h 直播 + 每餐打卡</text>
      </view>
      <view class="value-card">
        <text class="value-icon">🍲</text>
        <text class="value-title">过年杀猪饭</text>
        <text class="value-text">把家乡年味还给你</text>
      </view>
    </view>

    <!-- 公司信息 (提审必备) -->
    <view class="info-card">
      <text class="info-title">主体信息</text>
      <view class="info-row">
        <text class="info-label">运营方</text>
        <text class="info-value">W3217-SUDO · 待填正式工商名称</text>
      </view>
      <view class="info-row">
        <text class="info-label">ICP 备案</text>
        <text class="info-value">{{ icpNo }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">服务地区</text>
        <text class="info-value">中国大陆(港澳台暂未开通)</text>
      </view>
      <view class="info-row">
        <text class="info-label">客服邮箱</text>
        <text class="info-value">hello@rockingwei.online</text>
      </view>
      <view class="info-row">
        <text class="info-label">官网</text>
        <text class="info-value">www.rockingwei.online</text>
      </view>
    </view>

    <!-- 协议链接 -->
    <view class="links">
      <view class="link-item" @tap="goLink('terms')">
        <text class="link-icon">📜</text>
        <text class="link-text">用户协议</text>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-divider"></view>
      <view class="link-item" @tap="goLink('privacy')">
        <text class="link-icon">🔒</text>
        <text class="link-text">隐私政策</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <view class="copyright">
      <text>© 2026 私人订猪 · 版权所有</text>
      <text>🐷 「认一头猪 · 过一个年」</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const version = '1.0.0';
const buildTag = '2026-05-12';
// ICP 备案号占位,实际备案完成后填入
const icpNo = '蜀ICP备 XXXXXXXX 号 (备案中)';

function goLink(name: 'terms' | 'privacy') {
  uni.navigateTo({ url: `/pages/static/${name}` });
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding-bottom: 60rpx;
}

.hero {
  background: linear-gradient(165deg, #2c1810 0%, #5a2818 60%, #8b3a1a 100%);
  padding: 80rpx 40rpx 60rpx;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.lantern {
  display: block;
  font-size: 80rpx;
  margin-bottom: 16rpx;
}
.brand {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  color: #ffd89c;
  letter-spacing: 8rpx;
}
.slogan {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 8rpx;
  margin-top: 20rpx;
}
.version {
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 28rpx;
  letter-spacing: 1rpx;
}

.card {
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.card-eyebrow {
  display: block;
  font-size: 22rpx;
  color: #c0392b;
  font-weight: 700;
  letter-spacing: 6rpx;
  text-align: center;
  margin-bottom: 16rpx;
}
.card-text {
  display: block;
  font-size: 26rpx;
  color: #444;
  line-height: 1.85;
  white-space: pre-line;
}

.values {
  display: flex;
  flex-wrap: wrap;
  padding: 12rpx 16rpx;
}
.value-card {
  width: 50%;
  padding: 12rpx;
  box-sizing: border-box;
}
.value-card text { display: block; text-align: center; }
.value-card text.value-icon { font-size: 56rpx; margin-bottom: 8rpx; }
.value-card text.value-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #1a1a1a;
}
.value-card text.value-text {
  font-size: 22rpx;
  color: #888;
  margin-top: 4rpx;
}

.info-card {
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 28rpx;
}
.info-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #f5f3ec;
}
.info-row {
  display: flex;
  padding: 14rpx 0;
}
.info-label {
  width: 160rpx;
  font-size: 24rpx;
  color: #999;
  flex-shrink: 0;
}
.info-value {
  flex: 1;
  font-size: 24rpx;
  color: #444;
}

.links {
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
}
.link-item {
  display: flex;
  align-items: center;
  padding: 28rpx;
}
.link-icon { font-size: 32rpx; margin-right: 20rpx; }
.link-text {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 600;
}
.link-arrow { font-size: 32rpx; color: #ccc; }
.link-divider {
  height: 2rpx;
  background: #f5f3ec;
  margin-left: 84rpx;
}

.copyright {
  text-align: center;
  margin-top: 32rpx;
}
.copyright text {
  display: block;
  font-size: 20rpx;
  color: #bbb;
  line-height: 2;
  letter-spacing: 1rpx;
}
</style>
