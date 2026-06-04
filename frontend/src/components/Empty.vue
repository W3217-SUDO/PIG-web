<template>
  <view class="pig-empty">
    <text v-if="icon" class="pig-empty-icon">{{ icon }}</text>
    <text class="pig-empty-title">{{ title }}</text>
    <text v-if="description" class="pig-empty-desc">{{ description }}</text>
    <slot />
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    icon?: string;
  }>(),
  {
    title: '暂无数据',
    description: '',
    icon: '',
  },
);
</script>

<style>
.pig-empty {
  width: 100%;
  min-height: 220rpx;
  padding: 48rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-sizing: border-box;
}
.pig-empty-icon {
  font-size: 56rpx;
  line-height: 1;
  margin-bottom: 20rpx;
}
.pig-empty-title {
  color: #5c4a3f;
  font-size: 28rpx;
  font-weight: 700;
}
.pig-empty-desc {
  color: #9b8a7e;
  font-size: 24rpx;
  margin-top: 12rpx;
  text-align: center;
  line-height: 1.5;
}
</style>
