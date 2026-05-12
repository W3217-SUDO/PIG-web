<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value || 'all'"
        :class="['tab', activeTab === t.value && 'tab-on']"
        @tap="onTab(t.value)"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="empty">
      <text class="empty-icon">🐷</text>
      <text class="empty-text">还没有订单</text>
      <view class="empty-cta" @tap="goHome">
        <text>去挑一头猪</text>
      </view>
    </view>

    <view v-else class="list">
      <view v-for="o in list" :key="o.id" class="order-card" @tap="onOpen(o)">
        <view class="order-head">
          <text class="order-no">订单 {{ o.id.slice(0, 12) }}…</text>
          <text :class="['order-status', 'status-' + o.status]">{{ statusLabel(o.status) }}</text>
        </view>
        <view v-if="o.pig" class="order-body">
          <image class="pig-cover" :src="o.pig.coverImage" mode="aspectFill" />
          <view class="pig-meta">
            <text class="pig-title">{{ o.pig.title }}</text>
            <text class="pig-breed">{{ o.pig.breed }} · {{ o.pig.region }}</text>
            <text class="pig-shares">认领 {{ o.sharesCount }} 份</text>
          </view>
        </view>
        <view class="order-foot">
          <text class="order-time">{{ fmtTime(o.createdAt) }}</text>
          <text class="order-total">¥{{ o.totalPrice }}</text>
        </view>

        <!-- 按状态展示操作按钮 -->
        <view v-if="o.status === 'pending'" class="order-actions">
          <view class="action-btn ghost" @tap.stop="onCancel(o)"><text>取消</text></view>
          <view class="action-btn primary" @tap.stop="onPay(o)"><text>去支付</text></view>
        </view>
        <view v-else-if="o.status === 'paid'" class="order-actions">
          <view class="action-btn ghost" @tap.stop="onRefund(o)"><text>申请退款</text></view>
          <view class="action-btn primary" @tap.stop="onShare(o)"><text>🤝 拼猪</text></view>
        </view>
        <view v-else-if="o.status === 'shipped'" class="order-actions">
          <view class="action-btn primary" @tap.stop="onConfirmReceived(o)"><text>确认收货</text></view>
        </view>
      </view>
    </view>

    <!-- 分享码弹层 -->
    <view v-if="shareModal" class="share-modal-mask" @tap="shareModal = null">
      <view class="share-modal" @tap.stop>
        <text class="share-modal-title">拼猪邀请码</text>
        <view class="share-code-box">
          <text class="share-code">{{ shareModal.code }}</text>
        </view>
        <text class="share-modal-tip">复制下面链接发给亲戚朋友, 他们打开就能看到这头猪。</text>
        <view class="share-link-box" @tap="onCopy(shareModal.link)">
          <text class="share-link">{{ shareModal.link }}</text>
          <view class="copy-btn"><text>复制</text></view>
        </view>
        <text class="share-modal-ttl">{{ shareModal.ttl }} 过期</text>
        <view class="share-modal-close" @tap="shareModal = null">
          <text>关闭</text>
        </view>
      </view>
    </view>

    <!-- 退款弹层 -->
    <view v-if="refundOpen" class="share-modal-mask" @tap="refundOpen = null">
      <view class="share-modal" @tap.stop>
        <text class="share-modal-title">申请退款</text>
        <text class="share-modal-tip">请简要说明退款原因(2~256 字)</text>
        <textarea
          v-model="refundReason"
          class="refund-textarea"
          placeholder="如:尺寸不合适、暂时不需要…"
          maxlength="256"
        />
        <view class="refund-actions">
          <view class="action-btn ghost" @tap="refundOpen = null"><text>取消</text></view>
          <view class="action-btn primary" @tap="onRefundSubmit"><text>提交</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface PigBrief {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
}
type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';
interface Order {
  id: string;
  createdAt: string;
  pigId: string;
  sharesCount: number;
  unitPrice: string;
  totalPrice: string;
  status: OrderStatus;
  paidAt: string | null;
  pig?: PigBrief | null;
}

const tabs: Array<{ label: string; value: string }> = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '代养中', value: 'paid' },
  { label: '发货中', value: 'shipped' },
  { label: '已完成', value: 'delivered' },
  { label: '售后', value: 'refund_pending' },
];
const activeTab = ref<string>('');
const list = ref<Order[]>([]);
const loading = ref(true);

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: '待支付',
    paid: '代养中',
    shipped: '已发货',
    delivered: '已完成',
    cancelled: '已取消',
    refund_pending: '退款审核中',
    refunded: '已退款',
  };
  return m[s] || s;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  loading.value = true;
  try {
    const qs = activeTab.value ? `?status=${activeTab.value}&pageSize=50` : '?pageSize=50';
    const data = await request<{ items: Order[] }>(`/orders/me${qs}`);
    list.value = data.items;
  } catch (e) {
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

function onTab(v: string) {
  activeTab.value = v;
  load();
}

function onOpen(o: Order) {
  uni.navigateTo({ url: `/pages/order/detail?id=${o.id}` });
}

function onCancel(o: Order) {
  uni.showModal({
    title: '提示',
    content: `取消订单 ${o.id.slice(0, 12)}…?`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request(`/orders/${o.id}/cancel`, { method: 'POST' });
        uni.showToast({ title: '已取消', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({ title: e instanceof ApiError ? e.message : '取消失败', icon: 'none' });
      }
    },
  });
}

async function onPay(o: Order) {
  // 简化:列表里 mock 支付;真实流程在订单详情页选支付方式
  try {
    await request(`/orders/${o.id}/mock-paid`, { method: 'POST' });
    uni.showToast({ title: '支付成功', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '支付失败', icon: 'none' });
  }
}

// ===== 退款 =====
const refundOpen = ref<Order | null>(null);
const refundReason = ref('');

function onRefund(o: Order) {
  refundReason.value = '';
  refundOpen.value = o;
}

async function onRefundSubmit() {
  if (!refundOpen.value) return;
  const reason = refundReason.value.trim();
  if (reason.length < 2) {
    uni.showToast({ title: '请填写退款原因(≥2 字)', icon: 'none' });
    return;
  }
  try {
    await request(`/orders/${refundOpen.value.id}/refund-request`, {
      method: 'POST',
      data: { reason },
    });
    uni.showToast({ title: '已提交退款申请', icon: 'success' });
    refundOpen.value = null;
    await load();
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '提交失败', icon: 'none' });
  }
}

async function onConfirmReceived(o: Order) {
  uni.showModal({
    title: '确认收货',
    content: '请收到货检查无误后再确认收货',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request(`/orders/${o.id}/confirm-received`, { method: 'POST' });
        uni.showToast({ title: '🐖 已确认收货', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({ title: e instanceof ApiError ? e.message : '操作失败', icon: 'none' });
      }
    },
  });
}

// ===== 拼猪 =====
const shareModal = ref<{ code: string; link: string; ttl: string } | null>(null);

async function onShare(o: Order) {
  try {
    const invite = await request<{ code: string; expiresAt: string }>(
      `/orders/${o.id}/share`,
      { method: 'POST' },
    );
    const days = Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000);
    // #ifdef H5
    const base = window.location.origin + '/#';
    // #endif
    // #ifndef H5
    const base = 'https://www.rockingwei.online/#';
    // #endif
    const link = `${base}/pages/share/landing?code=${invite.code}`;
    shareModal.value = { code: invite.code, link, ttl: `${days} 天后` };
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '生成失败', icon: 'none' });
  }
}

function onCopy(text: string) {
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'success' }) });
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}

onShow(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
}
.tabs {
  background: #fff;
  display: flex;
  padding: 0 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  overflow-x: auto;
}
.tab {
  flex-shrink: 0;
  padding: 24rpx 28rpx;
  text-align: center;
  position: relative;
}
.tab text {
  font-size: 26rpx;
  color: #888;
}
.tab-on text { color: #c0392b; font-weight: 800; }
.tab-on::after {
  content: '';
  position: absolute;
  bottom: 0; left: 25%; right: 25%;
  height: 4rpx;
  background: #c0392b;
  border-radius: 2rpx;
}

.state, .empty {
  padding: 200rpx 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state text, .empty-text { color: #999; font-size: 28rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 16rpx; }
.empty-cta {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  padding: 20rpx 56rpx;
  border-radius: 44rpx;
}
.empty-cta text { color: #fff; font-size: 28rpx; font-weight: 700; }

.list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}
.order-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 2rpx dashed #f0e8d4;
  margin-bottom: 16rpx;
}
.order-no {
  font-size: 22rpx;
  color: #999;
}
.order-status {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}
.status-pending { background: #fff5e6; color: #ff9800; }
.status-paid { background: #e7f7ee; color: #1aad19; }
.status-shipped { background: #e3f2fd; color: #1976d2; }
.status-delivered { background: #e8f5e9; color: #2e7d32; }
.status-cancelled { background: #f3f3f3; color: #999; }
.status-refund_pending { background: #ececec; color: #757575; }
.status-refunded { background: #fde8e7; color: #c0392b; }

.order-body {
  display: flex;
  padding-bottom: 16rpx;
}
.pig-cover {
  width: 144rpx; height: 144rpx;
  border-radius: 16rpx;
  background: #ddd;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.pig-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.pig-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.pig-breed {
  font-size: 22rpx;
  color: #888;
  margin-top: 4rpx;
}
.pig-shares {
  margin-top: auto;
  font-size: 24rpx;
  color: #c0392b;
}

.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 12rpx;
  border-top: 2rpx solid #f5f3ec;
}
.order-time {
  font-size: 22rpx;
  color: #aaa;
}
.order-total {
  font-size: 30rpx;
  color: #c0392b;
  font-weight: 800;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f5f3ec;
}
.action-btn {
  padding: 12rpx 28rpx;
  border-radius: 28rpx;
  margin-left: 16rpx;
}
.action-btn.ghost {
  border: 2rpx solid #ddd;
}
.action-btn.ghost text { color: #666; font-size: 22rpx; }
.action-btn.primary {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
}
.action-btn.primary text { color: #fff; font-size: 22rpx; font-weight: 700; }

/* ===== 分享 / 退款 弹层 ===== */
.share-modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-modal {
  width: 80%;
  max-width: 620rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 44rpx 36rpx 32rpx;
  text-align: center;
}
.share-modal-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
  margin-bottom: 24rpx;
}
.share-code-box {
  background: linear-gradient(135deg, #2c1810, #5a2818);
  border-radius: 24rpx;
  padding: 32rpx 0;
  margin-bottom: 24rpx;
}
.share-code {
  color: #ffd89c;
  font-size: 60rpx;
  font-weight: 800;
  letter-spacing: 8rpx;
}
.share-modal-tip {
  font-size: 24rpx;
  color: #666;
  line-height: 1.7;
  display: block;
  margin-bottom: 20rpx;
}
.share-link-box {
  display: flex;
  align-items: center;
  background: #f5f3ec;
  border-radius: 16rpx;
  padding: 16rpx 16rpx 16rpx 20rpx;
  margin-bottom: 20rpx;
}
.share-link {
  flex: 1;
  font-size: 22rpx;
  color: #444;
  text-align: left;
  word-break: break-all;
}
.copy-btn {
  flex-shrink: 0;
  background: #c0392b;
  border-radius: 24rpx;
  padding: 10rpx 20rpx;
  margin-left: 12rpx;
}
.copy-btn text { color: #fff; font-size: 22rpx; font-weight: 700; }
.share-modal-ttl {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-bottom: 24rpx;
}
.share-modal-close {
  border-top: 2rpx solid #f0e8d4;
  padding-top: 24rpx;
}
.share-modal-close text {
  color: #999;
  font-size: 26rpx;
}

.refund-textarea {
  width: 100%;
  min-height: 200rpx;
  background: #f5f3ec;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
  text-align: left;
}
.refund-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #f0e8d4;
}
.refund-actions .action-btn {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
}
</style>
