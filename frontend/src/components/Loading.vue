<template>
  <view class="pig-loading" :class="{ 'pig-loading-inline': inline }">
    <view class="pig-loading-dot" />
    <text v-if="text" class="pig-loading-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string;
    inline?: boolean;
  }>(),
  {
    text: '加载中',
    inline: false,
  },
);
</script>

<style>
.pig-loading {
  width: 100%;
  min-height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.pig-loading-inline {
  width: auto;
  min-height: 0;
  flex-direction: row;
}
.pig-loading-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  border: 5rpx solid rgba(192, 57, 43, 0.18);
  border-top-color: #c0392b;
  animation: pig-spin 0.8s linear infinite;
}
.pig-loading-text {
  color: #7b6656;
  font-size: 24rpx;
  margin-top: 18rpx;
}
.pig-loading-inline .pig-loading-text {
  margin-top: 0;
  margin-left: 14rpx;
}
@keyframes pig-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
