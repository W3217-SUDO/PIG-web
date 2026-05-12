<template>
  <view class="page">
    <view class="hero">
      <view class="hero-icon">
        <text>{{ ok ? '🎉' : '😢' }}</text>
      </view>
      <text class="hero-title">{{ ok ? '认领成功!' : '支付未完成' }}</text>
      <text v-if="ok" class="hero-sub">这头猪现在是你的了</text>
      <text v-else class="hero-sub">订单状态可在「我的订单」查看</text>
    </view>

    <view v-if="order" class="info-card">
      <view class="row">
        <text class="label">订单号</text>
        <text class="value">{{ order.id.slice(0, 16) }}…</text>
      </view>
      <view class="row">
        <text class="label">份额</text>
        <text class="value">{{ order.sharesCount }} 份</text>
      </view>
      <view class="row">
        <text class="label">金额</text>
        <text class="value strong">¥{{ order.totalPrice }}</text>
      </view>
      <view class="row">
        <text class="label">状态</text>
        <text :class="['value', statusClass]">{{ statusLabel }}</text>
      </view>
      <view v-if="order.paidAt" class="row">
        <text class="label">支付时间</text>
        <text class="value">{{ fmtTime(order.paidAt) }}</text>
      </view>
    </view>

    <view class="actions">
      <view class="btn btn-ghost" @tap="goHome">
        <text>回首页</text>
      </view>
      <view class="btn btn-primary" @tap="goMyOrders">
        <text>查看我的订单</text>
      </view>
    </view>

    <view class="next-tip" v-if="ok">
      <text class="tip-eyebrow">— 接下来 —</text>
      <text class="tip-body">这头猪从今天起就由 <text class="tip-strong">山区农户</text> 替你养着。
你可以随时回 App 看每日打卡、健康记录,腊月出栏整猪送到家。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface Order {
  id: string;
  sharesCount: number;
  totalPrice: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paidAt: string | null;
}

const order = ref<Order | null>(null);
const ok = ref(false);

const statusLabel = computed(() => {
  const s = order.value?.status;
  return s === 'paid' ? '已支付'
    : s === 'pending' ? '待支付'
    : s === 'cancelled' ? '已取消'
    : s === 'refunded' ? '已退款'
    : '-';
});
const statusClass = computed(() => order.value?.status === 'paid' ? 'value-ok' : 'value-pending');

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}
function goMyOrders() {
  uni.reLaunch({ url: '/pages/my/orders' });
}

onLoad(async (opts: Record<string, string | undefined>) => {
  ok.value = opts?.ok === '1';
  if (opts?.id) {
    try {
      order.value = await request<Order>(`/orders/${opts.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        uni.showToast({ title: e.message, icon: 'none' });
      }
    }
  }
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding: 24rpx;
}
.hero {
  text-align: center;
  padding: 60rpx 0 40rpx;
}
.hero-icon {
  width: 160rpx; height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff5e6, #ffe4ba);
  margin: 0 auto 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.18);
}
.hero-icon text { font-size: 80rpx; }
.hero-title {
  font-size: 44rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
  letter-spacing: 2rpx;
}
.hero-sub {
  font-size: 26rpx;
  color: #888;
  display: block;
  margin-top: 12rpx;
}

.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx 28rpx;
  margin-bottom: 28rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 2rpx solid #f5f3ec;
}
.row:last-child { border-bottom: none; }
.label {
  font-size: 26rpx;
  color: #999;
}
.value {
  font-size: 26rpx;
  color: #444;
}
.value.strong { font-size: 30rpx; color: #c0392b; font-weight: 800; }
.value-ok { color: #1aad19; font-weight: 700; }
.value-pending { color: #ff9800; font-weight: 700; }

.actions {
  display: flex;
  margin-bottom: 28rpx;
}
.btn {
  flex: 1;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn + .btn { margin-left: 20rpx; }
.btn-ghost {
  background: #fff;
  border: 2rpx solid #c0392b;
}
.btn-ghost text { color: #c0392b; font-size: 28rpx; font-weight: 700; }
.btn-primary {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.30);
}
.btn-primary text { color: #fff; font-size: 28rpx; font-weight: 800; }

.next-tip {
  background: linear-gradient(135deg, #FFF8EE, #f5e9d4);
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
}
.tip-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: #c0392b;
  font-weight: 700;
  margin-bottom: 16rpx;
}
.tip-body {
  font-size: 26rpx;
  color: #5a2818;
  line-height: 1.85;
  display: block;
}
.tip-strong { color: #c0392b; font-weight: 700; }
</style>
