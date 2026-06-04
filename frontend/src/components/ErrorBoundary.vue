<template>
  <view v-if="error" class="pig-error">
    <text class="pig-error-title">{{ title }}</text>
    <text class="pig-error-message">{{ message || error }}</text>
    <view v-if="retryable" class="pig-error-action" @tap="retry">
      <text>重试</text>
    </view>
  </view>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    retryable?: boolean;
  }>(),
  {
    title: '页面出错了',
    message: '',
    retryable: true,
  },
);

const emit = defineEmits<{
  (e: 'retry'): void;
}>();

const caught = ref('');
const error = computed(() => caught.value);

onErrorCaptured((err) => {
  caught.value = err instanceof Error ? err.message : String(err);
  return false;
});

function retry() {
  caught.value = '';
  emit('retry');
}
</script>

<style>
.pig-error {
  margin: 32rpx;
  padding: 36rpx 32rpx;
  border-radius: 16rpx;
  background: #fff7f5;
  border: 2rpx solid #ffd3ca;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pig-error-title {
  color: #9f2f25;
  font-size: 30rpx;
  font-weight: 800;
}
.pig-error-message {
  color: #7a5f58;
  font-size: 24rpx;
  line-height: 1.5;
  margin-top: 14rpx;
  text-align: center;
  word-break: break-all;
}
.pig-error-action {
  min-width: 148rpx;
  height: 64rpx;
  margin-top: 28rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #c0392b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pig-error-action text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
