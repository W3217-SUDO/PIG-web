<template>
  <view class="page">
    <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
    <scroll-view v-else scroll-y class="scroll">
      <view v-if="!pigs.length" class="center">
        <text class="empty-emoji">🐷</text>
        <text class="empty-text">暂无托管猪只</text>
      </view>

      <view v-for="pig in pigs" :key="pig.id" class="pig-card">
        <view class="card-top">
          <view class="pig-left">
            <text class="pig-icon">🐷</text>
            <view class="pig-name-wrap">
              <text class="pig-name">{{ pig.nickname }}</text>
              <text class="stall-no">{{ pig.stallNo }}</text>
            </view>
          </view>
          <view class="health-tag" :class="pig.healthStatus">
            <text>{{ healthLabel(pig.healthStatus) }}</text>
          </view>
        </view>

        <view class="divider" />

        <view class="pig-stats">
          <view class="stat-item">
            <text class="stat-val">{{ pig.weightKg ?? '—' }}</text>
            <text class="stat-unit">kg</text>
            <text class="stat-label">当前体重</text>
          </view>
          <view class="stat-sep" />
          <view class="stat-item">
            <text class="stat-val">{{ pig.daysRaised }}</text>
            <text class="stat-unit">天</text>
            <text class="stat-label">已饲养</text>
          </view>
          <view class="stat-sep" />
          <view class="stat-item">
            <text class="stat-val owner-val">{{ pig.ownerName || '待认领' }}</text>
            <text class="stat-label">主人</text>
          </view>
        </view>
      </view>

      <view class="footer-tip">
        <text class="tip-text">共托管 {{ pigs.length }} 头猪只</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, getFarmerId } from '../../utils/request';

interface Pig {
  id: string;
  nickname: string;
  stallNo: string;
  healthStatus: string;
  weightKg: number | null;
  daysRaised: number;
  ownerName: string;
}

const pigs = ref<Pig[]>([]);
const loading = ref(true);

onShow(load);

async function load() {
  const farmerId = getFarmerId();
  if (!farmerId) { uni.reLaunch({ url: '/pages/login/index' }); return; }
  loading.value = true;
  try {
    pigs.value = await request<Pig[]>(`/foster/pigs?farmerId=${farmerId}`);
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function healthLabel(s: string) {
  if (s === 'healthy') return '健康';
  if (s === 'sick') return '生病';
  if (s === 'recovering') return '恢复中';
  return '待检查';
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.scroll { height: 100vh; padding: 24rpx; box-sizing: border-box; }
.center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 40rpx; }
.gray { color: #aaa; font-size: 30rpx; }
.empty-emoji { font-size: 100rpx; }
.empty-text { font-size: 32rpx; color: #888; margin-top: 24rpx; }

.pig-card { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }

.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.pig-left { display: flex; align-items: center; gap: 16rpx; }
.pig-icon { font-size: 52rpx; }
.pig-name-wrap { display: flex; flex-direction: column; }
.pig-name { font-size: 34rpx; font-weight: 700; color: #222; }
.stall-no { font-size: 24rpx; color: #2d8a4e; margin-top: 4rpx; font-weight: 500; }

.health-tag { padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: 500; }
.health-tag.healthy { background: #f6ffed; color: #52c41a; }
.health-tag.sick { background: #fff1f0; color: #ff4d4f; }
.health-tag.recovering { background: #fff7e6; color: #fa8c16; }
.health-tag.unknown { background: #f5f5f5; color: #999; }

.divider { height: 1rpx; background: #f0f0f0; margin-bottom: 24rpx; }

.pig-stats { display: flex; align-items: center; }
.stat-item { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
.stat-val { font-size: 44rpx; font-weight: 800; color: #222; line-height: 1; }
.owner-val { font-size: 30rpx; font-weight: 600; color: #2d8a4e; }
.stat-unit { font-size: 22rpx; color: #999; margin-top: 2rpx; }
.stat-label { font-size: 24rpx; color: #aaa; margin-top: 8rpx; }
.stat-sep { width: 1rpx; height: 60rpx; background: #eee; }

.footer-tip { text-align: center; padding: 24rpx; }
.tip-text { font-size: 26rpx; color: #bbb; }
</style>
