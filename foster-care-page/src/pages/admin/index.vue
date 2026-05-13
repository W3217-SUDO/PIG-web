<template>
  <view class="page">
    <view class="header">
      <text class="title">⚙️ 数据管理中心</text>
      <text class="sub">录入和管理农户、猪只及任务数据</text>
    </view>

    <view class="menu-list">
      <view class="menu-item" @tap="go('farmers')">
        <view class="menu-icon green">👨‍🌾</view>
        <view class="menu-info">
          <text class="menu-name">农户管理</text>
          <text class="menu-desc">添加 / 编辑 / 删除农户档案</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="menu-item" @tap="go('pigs')">
        <view class="menu-icon orange">🐷</view>
        <view class="menu-info">
          <text class="menu-name">猪只管理</text>
          <text class="menu-desc">录入猪只信息、上架下架管理</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="menu-item" @tap="go('tasks')">
        <view class="menu-icon blue">📋</view>
        <view class="menu-info">
          <text class="menu-name">任务管理</text>
          <text class="menu-desc">为农户生成今日喂养任务</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="back-btn" @tap="back">
      <text>← 返回登录页</text>
    </view>
  </view>
</template>

<script setup lang="ts">
function go(page: string) {
  uni.navigateTo({ url: `/pages/admin/${page}` });
}
function back() {
  uni.navigateBack();
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; padding: 0 0 40rpx; }
.header { background: linear-gradient(135deg, #1a6b35, #2d8a4e); padding: 60rpx 40rpx 48rpx; }
.title { font-size: 40rpx; font-weight: 800; color: #fff; display: block; }
.sub { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; display: block; }
.menu-list { margin: 32rpx 32rpx 0; }
.menu-item { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 20rpx; display: flex; align-items: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.menu-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; margin-right: 24rpx; flex-shrink: 0; }
.menu-icon.green { background: #f0faf4; }
.menu-icon.orange { background: #fff7e6; }
.menu-icon.blue { background: #e8f4ff; }
.menu-info { flex: 1; }
.menu-name { font-size: 32rpx; font-weight: 700; color: #222; display: block; }
.menu-desc { font-size: 24rpx; color: #888; margin-top: 6rpx; display: block; }
.arrow { font-size: 40rpx; color: #ccc; font-weight: 300; }
.back-btn { text-align: center; margin-top: 40rpx; padding: 24rpx; }
.back-btn text { font-size: 28rpx; color: #888; }
</style>
