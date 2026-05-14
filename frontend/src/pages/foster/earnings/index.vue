<template>
  <view class="page">
    <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
    <scroll-view v-else scroll-y class="scroll" style="padding-bottom:120rpx;box-sizing:border-box;">
      <!-- 汇总卡片 -->
      <view class="summary-card">
        <view class="summary-item">
          <text class="summary-label">本月收益</text>
          <view class="amount-row">
            <text class="currency">¥</text>
            <text class="summary-amount green">{{ summary.thisMonth.toFixed(2) }}</text>
          </view>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label">累计收益</text>
          <view class="amount-row">
            <text class="currency">¥</text>
            <text class="summary-amount orange">{{ summary.total.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 月度明细 -->
      <view class="section-title">月度明细</view>
      <view v-if="!earnings.length" class="center">
        <text class="gray">暂无收益记录</text>
      </view>
      <view v-else class="detail-card">
        <view
          v-for="(item, idx) in earnings"
          :key="idx"
          class="detail-row"
        >
          <view class="month-info">
            <text class="month-text">{{ item.year }}年{{ item.month }}月</text>
          </view>
          <view class="bar-wrap">
            <view class="bar" :style="{ width: barWidth(item.amount) }"></view>
          </view>
          <text class="amount-text">¥{{ item.amount.toFixed(2) }}</text>
        </view>
      </view>

      <view class="footer-note">
        <text class="note-text">💡 收益每月结算一次，次月5日前到账</text>
      </view>
    </scroll-view>

    <FosterTabBar current="earnings" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, getFarmerId } from '../../../utils/fosterRequest';
import FosterTabBar from '../../../components/FosterTabBar.vue';

interface Earning { year: number; month: number; amount: number; }
interface EarningsResp { thisMonth: number; total: number; list: Earning[]; }

const earnings = ref<Earning[]>([]);
const summary = ref({ thisMonth: 0, total: 0 });
const loading = ref(true);

onShow(load);

async function load() {
  const farmerId = getFarmerId();
  if (!farmerId) { uni.reLaunch({ url: '/pages/foster/login/index' }); return; }
  loading.value = true;
  try {
    const resp = await request<EarningsResp>(`/foster/earnings?farmerId=${farmerId}`);
    summary.value = { thisMonth: resp.thisMonth, total: resp.total };
    earnings.value = resp.list;
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

const maxAmount = computed(() => {
  if (!earnings.value.length) return 1;
  return Math.max(...earnings.value.map(e => e.amount));
});

function barWidth(amount: number): string {
  const pct = Math.round((amount / maxAmount.value) * 100);
  return `${Math.max(pct, 4)}%`;
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.scroll { height: 100vh; padding: 24rpx; box-sizing: border-box; }
.center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80rpx 40rpx; }
.gray { color: #aaa; font-size: 30rpx; }

.summary-card { background: linear-gradient(135deg, #1a6b35, #2d8a4e); border-radius: 24rpx; padding: 48rpx 40rpx; margin-bottom: 32rpx; display: flex; align-items: center; box-shadow: 0 4rpx 20rpx rgba(45,138,78,0.3); }
.summary-item { flex: 1; text-align: center; }
.summary-label { font-size: 26rpx; color: rgba(255,255,255,0.8); display: block; margin-bottom: 16rpx; }
.amount-row { display: flex; align-items: baseline; justify-content: center; }
.currency { font-size: 28rpx; color: #fff; margin-right: 4rpx; font-weight: 500; }
.summary-amount { font-size: 64rpx; font-weight: 800; color: #fff; line-height: 1; }
.summary-divider { width: 1rpx; height: 80rpx; background: rgba(255,255,255,0.3); }

.section-title { font-size: 30rpx; font-weight: 600; color: #333; padding: 0 8rpx 16rpx; }

.detail-card { background: #fff; border-radius: 20rpx; padding: 8rpx 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); margin-bottom: 24rpx; }
.detail-row { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.detail-row:last-child { border-bottom: none; }
.month-info { width: 140rpx; flex-shrink: 0; }
.month-text { font-size: 26rpx; color: #555; font-weight: 500; }
.bar-wrap { flex: 1; height: 16rpx; background: #f0f0f0; border-radius: 8rpx; margin: 0 20rpx; overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg, #2d8a4e, #52c41a); border-radius: 8rpx; transition: width 0.4s ease; }
.amount-text { width: 140rpx; text-align: right; font-size: 28rpx; font-weight: 700; color: #2d8a4e; flex-shrink: 0; }

.footer-note { text-align: center; padding: 24rpx 40rpx; }
.note-text { font-size: 24rpx; color: #bbb; }
</style>
