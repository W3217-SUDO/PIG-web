<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>

    <template v-else>
      <!-- 余额卡 -->
      <view class="balance-card">
        <view class="balance-glow"></view>
        <text class="balance-label">余 额(元)</text>
        <view class="balance-num">
          <text class="balance-yuan">¥</text>
          <text class="balance-int">{{ balanceInt }}</text>
          <text class="balance-dec">.{{ balanceDec }}</text>
        </view>
        <view class="balance-row">
          <text class="balance-frozen">冻结:¥{{ wallet?.frozen || '0.00' }}</text>
          <view class="topup-btn" @tap="onTopup"><text>💰 充值</text></view>
        </view>
      </view>

      <!-- 流水 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">流水记录</text>
          <text class="card-sub">{{ list.length }} 条</text>
        </view>
        <view v-if="!list.length" class="empty">
          <text>暂无流水</text>
        </view>
        <view v-else>
          <view v-for="t in list" :key="t.id" class="tx-row">
            <view class="tx-icon" :class="t.direction">
              <text>{{ t.direction === 'in' ? '＋' : '−' }}</text>
            </view>
            <view class="tx-meta">
              <text class="tx-type">{{ typeLabel(t.type) }}</text>
              <text class="tx-time">{{ fmtTime(t.createdAt) }}</text>
            </view>
            <view class="tx-amount">
              <text :class="['tx-num', t.direction]">{{ t.direction === 'in' ? '+' : '-' }}¥{{ t.amount }}</text>
              <text class="tx-balance">余额 ¥{{ t.balanceAfter }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface Wallet {
  id: string;
  balance: string;
  frozen: string;
}
interface Tx {
  id: string;
  createdAt: string;
  direction: 'in' | 'out';
  type: string;
  amount: string;
  balanceAfter: string;
  note: string;
}

const wallet = ref<Wallet | null>(null);
const list = ref<Tx[]>([]);
const loading = ref(true);

const balanceInt = computed(() => {
  if (!wallet.value) return '0';
  return wallet.value.balance.split('.')[0] || '0';
});
const balanceDec = computed(() => {
  if (!wallet.value) return '00';
  return (wallet.value.balance.split('.')[1] || '00').padEnd(2, '0');
});

function typeLabel(t: string) {
  return t === 'topup' ? '💰 充值'
    : t === 'order_pay' ? '🐷 下单扣款'
    : t === 'daily_charge' ? '🌾 每日代养费'
    : t === 'refund' ? '↩️ 退款'
    : t === 'adjust' ? '⚙️ 运营调整'
    : t;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  loading.value = true;
  try {
    const data = await request<{ wallet: Wallet; recent: Tx[] }>('/wallet/me');
    wallet.value = data.wallet;
    list.value = data.recent;
  } catch (e) {
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

function onTopup() {
  uni.showModal({
    title: '充值',
    content: '充值多少元?(开发环境直接到账,不走真实支付)',
    editable: true,
    placeholderText: '100',
    success: async (res) => {
      if (!res.confirm) return;
      const v = parseFloat(res.content || '0');
      if (!Number.isFinite(v) || v <= 0) {
        uni.showToast({ title: '请输入正数', icon: 'none' });
        return;
      }
      try {
        await request('/wallet/topup', { method: 'POST', data: { amount: v } });
        uni.showToast({ title: '充值成功', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({ title: e instanceof ApiError ? e.message : '充值失败', icon: 'none' });
      }
    },
  });
}

onShow(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding: 24rpx;
}
.state {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
}

.balance-card {
  background: linear-gradient(135deg, #2c1810, #5a2818, #8b3a1a);
  border-radius: 32rpx;
  padding: 36rpx 36rpx 32rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 16rpx 48rpx rgba(192, 57, 43, 0.20);
  margin-bottom: 24rpx;
}
.balance-glow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 80% 30%, rgba(255, 158, 61, 0.25), transparent 60%);
  pointer-events: none;
}
.balance-label {
  font-size: 22rpx;
  color: rgba(255, 216, 156, 0.85);
  letter-spacing: 6rpx;
  display: block;
  position: relative;
  z-index: 2;
}
.balance-num {
  display: flex;
  align-items: baseline;
  margin: 16rpx 0 24rpx;
  position: relative;
  z-index: 2;
}
.balance-yuan { font-size: 36rpx; color: #ffd89c; font-weight: 700; margin-right: 4rpx; }
.balance-int {
  font-size: 88rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1rpx;
}
.balance-dec { font-size: 36rpx; color: #ffd89c; font-weight: 700; }

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}
.balance-frozen {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}
.topup-btn {
  background: linear-gradient(135deg, #ffd89c, #ff9e3d);
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
}
.topup-btn text {
  color: #2c1810;
  font-size: 26rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #f5f3ec;
}
.card-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #1a1a1a;
}
.card-sub {
  font-size: 22rpx;
  color: #999;
}
.empty {
  padding: 60rpx 0;
  text-align: center;
}
.empty text { color: #aaa; font-size: 26rpx; }

.tx-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx dashed #f0e8d4;
}
.tx-row:last-child { border-bottom: none; }
.tx-icon {
  width: 64rpx; height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.tx-icon.in { background: #e7f7ee; }
.tx-icon.in text { color: #1aad19; font-size: 32rpx; font-weight: 800; }
.tx-icon.out { background: #fde8e7; }
.tx-icon.out text { color: #c0392b; font-size: 32rpx; font-weight: 800; }
.tx-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.tx-type {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.tx-time {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 4rpx;
}
.tx-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.tx-num {
  font-size: 28rpx;
  font-weight: 800;
}
.tx-num.in { color: #1aad19; }
.tx-num.out { color: #c0392b; }
.tx-balance {
  font-size: 20rpx;
  color: #aaa;
  margin-top: 4rpx;
}
</style>
