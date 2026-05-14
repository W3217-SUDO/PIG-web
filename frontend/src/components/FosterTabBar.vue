<template>
  <view class="foster-tabbar">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ active: current === tab.key }"
      @tap="go(tab)"
    >
      <text class="tab-icon">{{ tab.icon }}</text>
      <text class="tab-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ current: 'workbench' | 'tasks' | 'pigs' | 'earnings' }>();

const tabs = [
  { key: 'workbench', icon: '🏠', label: '工作台',   url: '/pages/foster/workbench/index' },
  { key: 'tasks',     icon: '📋', label: '喂养任务', url: '/pages/foster/tasks/index' },
  { key: 'pigs',      icon: '🐷', label: '我的猪只', url: '/pages/foster/pigs/index' },
  { key: 'earnings',  icon: '💰', label: '收益中心', url: '/pages/foster/earnings/index' },
] as const;

function go(tab: typeof tabs[number]) {
  // 已在当前页不重复跳转
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1] as any;
  const curRoute = (cur?.route || '') as string;
  if (curRoute.includes(tab.key)) return;
  uni.redirectTo({ url: tab.url });
}
</script>

<style scoped>
.foster-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: #fff;
  border-top: 1rpx solid #e8e8e8;
  display: flex;
  align-items: center;
  z-index: 999;
  /* 兼容 iPhone X+ 底部安全区 */
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2rpx 16rpx rgba(0,0,0,0.06);
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8rpx 0;
}
.tab-icon {
  font-size: 40rpx;
  line-height: 1;
}
.tab-label {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
  font-weight: 500;
}
.tab-item.active .tab-label {
  color: #2d8a4e;
  font-weight: 700;
}
.tab-item.active .tab-icon {
  filter: none;
}
</style>
