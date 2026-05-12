<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="state err"><text>{{ errMsg }}</text></view>

    <template v-else-if="order">
      <!-- 顶部状态条 -->
      <view :class="['status-banner', `banner-${order.status}`]">
        <text class="status-icon">{{ statusIcon(order.status) }}</text>
        <view class="status-meta">
          <text class="status-name">{{ statusLabel(order.status) }}</text>
          <text class="status-sub">{{ statusSub(order) }}</text>
        </view>
      </view>

      <!-- 状态时间线 -->
      <view class="timeline-card">
        <view v-for="(s, i) in steps" :key="s.key" class="tl-row">
          <view class="tl-bullet-wrap">
            <view :class="['tl-bullet', s.done && 'tl-bullet-done', s.current && 'tl-bullet-cur']">
              <text v-if="s.done">✓</text>
              <text v-else>{{ i + 1 }}</text>
            </view>
            <view v-if="i < steps.length - 1" :class="['tl-line', s.done && 'tl-line-done']"></view>
          </view>
          <view class="tl-meta">
            <text :class="['tl-title', s.current && 'tl-title-cur']">{{ s.title }}</text>
            <text v-if="s.time" class="tl-time">{{ fmtTime(s.time) }}</text>
            <text v-else class="tl-time tl-time-empty">—</text>
          </view>
        </view>
      </view>

      <!-- 猪信息 -->
      <view v-if="order.pig" class="pig-card" @tap="goPig">
        <image class="pig-cover" :src="order.pig.coverImage" mode="aspectFill" />
        <view class="pig-meta">
          <text class="pig-title">{{ order.pig.title }}</text>
          <text class="pig-breed">{{ order.pig.breed }} · {{ order.pig.region }}</text>
          <text class="pig-shares">认领 {{ order.sharesCount }} 份 × ¥{{ order.unitPrice }}</text>
        </view>
        <text class="card-arrow">›</text>
      </view>

      <!-- 收货信息 -->
      <view v-if="order.addressSnapshot" class="info-card">
        <text class="info-title">📍 收货信息</text>
        <view class="info-row">
          <text class="info-name">{{ order.addressSnapshot.name }}</text>
          <text class="info-phone">{{ order.addressSnapshot.phone }}</text>
        </view>
        <text class="info-detail">
          {{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}
        </text>
      </view>

      <!-- 物流(已发货时) -->
      <view v-if="order.status === 'shipped' || order.status === 'delivered'" class="info-card">
        <text class="info-title">🚚 物流</text>
        <view class="info-line">
          <text class="info-k">屠宰日</text>
          <text class="info-v">{{ fmtDate(order.slaughterDate) }}</text>
        </view>
        <view v-if="order.trackingNo" class="info-line">
          <text class="info-k">物流单号</text>
          <text class="info-v">{{ order.trackingNo }}</text>
        </view>
      </view>

      <!-- 费用 -->
      <view class="cost-card">
        <view class="cost-row">
          <text>每份单价</text>
          <text>¥{{ order.unitPrice }}</text>
        </view>
        <view class="cost-row">
          <text>份数</text>
          <text>× {{ order.sharesCount }}</text>
        </view>
        <view class="cost-divider"></view>
        <view class="cost-row total">
          <text>合计</text>
          <text class="total-amount">¥{{ order.totalPrice }}</text>
        </view>
      </view>

      <!-- 订单元信息 -->
      <view class="meta-card">
        <view class="meta-row">
          <text class="meta-k">订单号</text>
          <text class="meta-v">{{ order.id }}</text>
        </view>
        <view class="meta-row">
          <text class="meta-k">下单时间</text>
          <text class="meta-v">{{ fmtTime(order.createdAt) }}</text>
        </view>
        <view v-if="order.paidAt" class="meta-row">
          <text class="meta-k">支付时间</text>
          <text class="meta-v">{{ fmtTime(order.paidAt) }}</text>
        </view>
        <view v-if="order.payMethod" class="meta-row">
          <text class="meta-k">支付方式</text>
          <text class="meta-v">{{ payMethodLabel(order.payMethod) }}</text>
        </view>
        <view v-if="order.remark" class="meta-row">
          <text class="meta-k">备注</text>
          <text class="meta-v">{{ order.remark }}</text>
        </view>
        <view v-if="order.refundReason" class="meta-row">
          <text class="meta-k">退款原因</text>
          <text class="meta-v">{{ order.refundReason }}</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>

      <!-- 底部按钮(按状态显示) -->
      <view class="cta-bar">
        <template v-if="order.status === 'pending'">
          <view class="action-btn ghost" @tap="onCancel"><text>取消订单</text></view>
          <view class="action-btn primary" @tap="onPay"><text>去支付</text></view>
        </template>
        <template v-else-if="order.status === 'paid'">
          <view class="action-btn ghost" @tap="onRefund"><text>申请退款</text></view>
          <view class="action-btn primary" @tap="onShare"><text>🤝 发起拼猪</text></view>
        </template>
        <template v-else-if="order.status === 'shipped'">
          <view class="action-btn primary" @tap="onConfirmReceived"><text>确认收货</text></view>
        </template>
        <template v-else-if="order.status === 'refund_pending'">
          <view class="action-btn ghost" @tap="goHome"><text>退款审核中</text></view>
        </template>
        <template v-else>
          <view class="action-btn ghost" @tap="goHome"><text>返回首页</text></view>
        </template>
      </view>

      <!-- 退款弹层 -->
      <view v-if="refundOpen" class="modal-mask" @tap="refundOpen = false">
        <view class="modal" @tap.stop>
          <text class="modal-title">申请退款</text>
          <text class="modal-tip">请简要说明退款原因(2~256 字),将在 1~3 个工作日内处理</text>
          <textarea
            v-model="refundReason"
            class="modal-textarea"
            placeholder="如:尺寸不合适、暂时不需要…"
            maxlength="256"
          />
          <view class="modal-actions">
            <view class="modal-btn ghost" @tap="refundOpen = false"><text>取消</text></view>
            <view class="modal-btn primary" @tap="onRefundSubmit"><text>提交</text></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface PigBrief {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
}
interface AddressSnapshot {
  name: string;
  phone: string;
  region: string;
  detail: string;
}
interface OrderPayment {
  channel: string;
  status: string;
  amount: string;
  transactionId: string | null;
  succeededAt: string | null;
}
interface OrderDetail {
  id: string;
  userId: string;
  pigId: string;
  sharesCount: number;
  unitPrice: string;
  totalPrice: string;
  status:
    | 'pending'
    | 'paid'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refund_pending'
    | 'refunded';
  payMethod: 'wxpay' | 'wallet' | 'mock' | null;
  paidAt: string | null;
  slaughterDate: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  refundedAt: string | null;
  refundReason: string;
  trackingNo: string;
  addressSnapshot: AddressSnapshot | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
  pig: PigBrief | null;
  payments: OrderPayment[];
}

const order = ref<OrderDetail | null>(null);
const loading = ref(true);
const errMsg = ref('');
const refundOpen = ref(false);
const refundReason = ref('');

let orderId = '';

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: '待支付',
    paid: '已支付 · 代养中',
    shipped: '已发货',
    delivered: '已完成',
    cancelled: '已取消',
    refund_pending: '退款审核中',
    refunded: '已退款',
  };
  return m[s] || s;
}
function statusIcon(s: string) {
  const m: Record<string, string> = {
    pending: '⏳',
    paid: '🐷',
    shipped: '🚚',
    delivered: '✅',
    cancelled: '✖️',
    refund_pending: '🕒',
    refunded: '💰',
  };
  return m[s] || '·';
}
function statusSub(o: OrderDetail): string {
  switch (o.status) {
    case 'pending':
      return '请尽快完成支付,15 分钟内有效';
    case 'paid':
      return '猪已经在养着,屠宰日期我们会提前通知';
    case 'shipped':
      return `屠宰日 ${fmtDate(o.slaughterDate)},正在冷链派送`;
    case 'delivered':
      return `感谢支持 · ${fmtTime(o.deliveredAt)} 确认收货`;
    case 'cancelled':
      return '订单已取消';
    case 'refund_pending':
      return '退款审核中,1~3 个工作日内处理';
    case 'refunded':
      return `已退款至钱包 · ${fmtTime(o.refundedAt)}`;
    default:
      return '';
  }
}
function payMethodLabel(p: string | null) {
  if (!p) return '—';
  return p === 'wxpay' ? '微信支付' : p === 'wallet' ? '钱包余额' : p === 'mock' ? '开发 mock' : p;
}

function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '';
}
function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('zh-CN') : '';
}

const steps = computed(() => {
  const o = order.value;
  if (!o) return [];
  const isCancelled = o.status === 'cancelled';
  const isRefunded = o.status === 'refunded' || o.status === 'refund_pending';
  if (isCancelled) {
    return [
      { key: 'created', title: '已下单', time: o.createdAt, done: true, current: false },
      { key: 'cancelled', title: '已取消', time: o.updatedAt, done: true, current: true },
    ];
  }
  if (isRefunded) {
    return [
      { key: 'created', title: '已下单', time: o.createdAt, done: true, current: false },
      { key: 'paid', title: '已支付', time: o.paidAt, done: true, current: false },
      {
        key: 'refund',
        title: o.status === 'refunded' ? '已退款' : '退款审核中',
        time: o.refundedAt || o.updatedAt,
        done: o.status === 'refunded',
        current: true,
      },
    ];
  }
  return [
    { key: 'created', title: '已下单', time: o.createdAt, done: true, current: o.status === 'pending' },
    { key: 'paid', title: '已支付', time: o.paidAt, done: !!o.paidAt, current: o.status === 'paid' },
    {
      key: 'shipped',
      title: '已发货',
      time: o.shippedAt,
      done: !!o.shippedAt,
      current: o.status === 'shipped',
    },
    {
      key: 'delivered',
      title: '已完成',
      time: o.deliveredAt,
      done: !!o.deliveredAt,
      current: o.status === 'delivered',
    },
  ];
});

async function load() {
  loading.value = true;
  errMsg.value = '';
  try {
    order.value = await request<OrderDetail>(`/orders/${orderId}`);
  } catch (e) {
    errMsg.value = e instanceof ApiError ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function goPig() {
  if (order.value?.pigId) {
    uni.navigateTo({ url: `/pages/pig/detail?id=${order.value.pigId}` });
  }
}
function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}

async function onCancel() {
  uni.showModal({
    title: '提示',
    content: '确定取消该订单吗?',
    success: async (res) => {
      if (!res.confirm || !order.value) return;
      try {
        await request(`/orders/${order.value.id}/cancel`, { method: 'POST' });
        uni.showToast({ title: '已取消', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({ title: e instanceof ApiError ? e.message : '取消失败', icon: 'none' });
      }
    },
  });
}

async function onPay() {
  if (!order.value) return;
  // 跳回下单确认页继续走支付方式选择(简化:这里直接 mock-paid)
  try {
    await request(`/orders/${order.value.id}/mock-paid`, { method: 'POST' });
    uni.showToast({ title: '支付成功', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '支付失败', icon: 'none' });
  }
}

function onRefund() {
  refundReason.value = '';
  refundOpen.value = true;
}
async function onRefundSubmit() {
  if (!order.value) return;
  const reason = refundReason.value.trim();
  if (reason.length < 2) {
    uni.showToast({ title: '请填写退款原因(≥2 字)', icon: 'none' });
    return;
  }
  try {
    await request(`/orders/${order.value.id}/refund-request`, {
      method: 'POST',
      data: { reason },
    });
    uni.showToast({ title: '已提交退款申请', icon: 'success' });
    refundOpen.value = false;
    await load();
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '提交失败', icon: 'none' });
  }
}

async function onConfirmReceived() {
  if (!order.value) return;
  uni.showModal({
    title: '确认收货',
    content: '请收到货检查无误后再确认收货',
    success: async (res) => {
      if (!res.confirm || !order.value) return;
      try {
        await request(`/orders/${order.value.id}/confirm-received`, { method: 'POST' });
        uni.showToast({ title: '🐖 已确认收货', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({ title: e instanceof ApiError ? e.message : '操作失败', icon: 'none' });
      }
    },
  });
}

async function onShare() {
  if (!order.value) return;
  try {
    const invite = await request<{ code: string; expiresAt: string }>(
      `/orders/${order.value.id}/share`,
      { method: 'POST' },
    );
    uni.showModal({
      title: '拼猪邀请码',
      content: `${invite.code}\n复制给亲友打开:https://www.rockingwei.online/#/pages/share/landing?code=${invite.code}`,
      showCancel: false,
    });
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '生成失败', icon: 'none' });
  }
}

onLoad((opts: Record<string, string | undefined>) => {
  orderId = opts?.id || '';
  if (!orderId) {
    errMsg.value = '缺少订单 ID';
    loading.value = false;
    return;
  }
});

onShow(() => {
  if (orderId) load();
});
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding: 24rpx 24rpx 0;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}
.state {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
}
.state.err { color: #c0392b; }

/* ===== 顶部状态条 ===== */
.status-banner {
  display: flex;
  align-items: center;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 20rpx;
  color: #fff;
}
.banner-pending { background: linear-gradient(135deg, #ff9800, #ffb74d); }
.banner-paid { background: linear-gradient(135deg, #2c1810, #5a2818); }
.banner-shipped { background: linear-gradient(135deg, #1976d2, #42a5f5); }
.banner-delivered { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
.banner-cancelled { background: #999; }
.banner-refund_pending { background: linear-gradient(135deg, #757575, #9e9e9e); }
.banner-refunded { background: linear-gradient(135deg, #c0392b, #e74c3c); }
.status-icon { font-size: 56rpx; margin-right: 20rpx; }
.status-meta { flex: 1; display: flex; flex-direction: column; }
.status-name { font-size: 32rpx; font-weight: 800; color: #fff; }
.status-sub { font-size: 22rpx; color: rgba(255, 255, 255, 0.85); margin-top: 8rpx; line-height: 1.6; }

/* ===== 时间线 ===== */
.timeline-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.tl-row { display: flex; align-items: flex-start; }
.tl-bullet-wrap {
  width: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20rpx;
}
.tl-bullet {
  width: 40rpx; height: 40rpx;
  border-radius: 50%;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tl-bullet text { color: #888; font-size: 22rpx; font-weight: 800; }
.tl-bullet-done { background: #c0392b; }
.tl-bullet-done text { color: #fff; }
.tl-bullet-cur { background: #c0392b; box-shadow: 0 0 0 8rpx rgba(192, 57, 43, 0.18); }
.tl-line {
  width: 4rpx;
  flex: 1;
  background: #eee;
  min-height: 40rpx;
  margin-top: 4rpx;
}
.tl-line-done { background: #c0392b; }
.tl-meta {
  flex: 1;
  padding-bottom: 24rpx;
  display: flex;
  flex-direction: column;
}
.tl-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #888;
}
.tl-title-cur { color: #c0392b; }
.tl-time {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 4rpx;
}
.tl-time-empty { color: #ccc; }

/* ===== 猪卡片 ===== */
.pig-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  position: relative;
}
.pig-cover {
  width: 144rpx; height: 144rpx;
  border-radius: 16rpx;
  background: #ddd;
  margin-right: 20rpx;
}
.pig-meta { flex: 1; display: flex; flex-direction: column; }
.pig-title { font-size: 28rpx; font-weight: 800; color: #1a1a1a; }
.pig-breed { font-size: 22rpx; color: #888; margin-top: 6rpx; }
.pig-shares { font-size: 24rpx; color: #c0392b; margin-top: auto; font-weight: 700; }
.card-arrow { font-size: 36rpx; color: #ccc; margin-left: 12rpx; }

/* ===== 信息卡 ===== */
.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
}
.info-title { font-size: 26rpx; font-weight: 800; color: #1a1a1a; display: block; margin-bottom: 14rpx; }
.info-row { display: flex; align-items: center; margin-bottom: 8rpx; }
.info-name { font-size: 28rpx; font-weight: 700; color: #1a1a1a; margin-right: 16rpx; }
.info-phone { font-size: 24rpx; color: #666; }
.info-detail { font-size: 24rpx; color: #555; line-height: 1.7; }
.info-line { display: flex; padding: 6rpx 0; }
.info-k { font-size: 24rpx; color: #888; width: 160rpx; }
.info-v { font-size: 24rpx; color: #333; flex: 1; }

/* ===== 费用 ===== */
.cost-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
}
.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
}
.cost-row text { font-size: 26rpx; color: #555; }
.cost-divider { height: 2rpx; background: #f5f3ec; margin: 6rpx 0; }
.cost-row.total text { font-size: 30rpx; font-weight: 800; color: #1a1a1a; }
.total-amount { color: #c0392b !important; font-size: 36rpx !important; }

/* ===== 元信息 ===== */
.meta-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
  margin-bottom: 20rpx;
}
.meta-row { display: flex; padding: 10rpx 0; }
.meta-k { font-size: 24rpx; color: #888; width: 160rpx; flex-shrink: 0; }
.meta-v { font-size: 24rpx; color: #333; flex: 1; word-break: break-all; }

.bottom-spacer { height: 24rpx; }

/* ===== 底部 CTA ===== */
.cta-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-top: 2rpx solid #f0e8d4;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 100;
}
.action-btn {
  padding: 22rpx 40rpx;
  border-radius: 44rpx;
  margin-left: 16rpx;
}
.action-btn.ghost { border: 2rpx solid #ddd; background: #fff; }
.action-btn.ghost text { color: #666; font-size: 26rpx; font-weight: 700; }
.action-btn.primary {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  box-shadow: 0 8rpx 24rpx rgba(192, 57, 43, 0.32);
}
.action-btn.primary text { color: #fff; font-size: 26rpx; font-weight: 800; }

/* ===== 退款弹层 ===== */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  width: 80%;
  max-width: 620rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 36rpx 32rpx 24rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
  text-align: center;
  margin-bottom: 16rpx;
}
.modal-tip {
  font-size: 22rpx;
  color: #888;
  display: block;
  line-height: 1.7;
  margin-bottom: 20rpx;
}
.modal-textarea {
  width: 100%;
  min-height: 200rpx;
  background: #f5f3ec;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
}
.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #f0e8d4;
}
.modal-btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 36rpx;
  text-align: center;
}
.modal-btn.ghost { background: #f5f3ec; margin-right: 16rpx; }
.modal-btn.ghost text { color: #666; font-size: 28rpx; font-weight: 700; }
.modal-btn.primary { background: linear-gradient(135deg, #c0392b, #e74c3c); }
.modal-btn.primary text { color: #fff; font-size: 28rpx; font-weight: 800; }
</style>
