<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="errMsg" class="state err"><text>{{ errMsg }}</text></view>

    <template v-else-if="pig">
      <!-- 猪信息 -->
      <view class="pig-row">
        <image class="pig-cover" :src="pig.coverImage" mode="aspectFill" />
        <view class="pig-meta">
          <text class="pig-title">{{ pig.title }}</text>
          <view class="pig-tags">
            <text class="tag">{{ pig.breed }}</text>
            <text class="tag tag-region">📍 {{ pig.region }}</text>
          </view>
          <text class="pig-unit-price">¥{{ priceInt }} / 份 · 剩余 {{ remainShares }} 份</text>
        </view>
      </view>

      <!-- 份额选择 -->
      <view class="card">
        <view class="card-row">
          <text class="card-label">认养份额</text>
          <view class="qty">
            <view class="qty-btn" @tap="decShares"><text>−</text></view>
            <text class="qty-num">{{ shares }}</text>
            <view class="qty-btn" @tap="incShares"><text>＋</text></view>
          </view>
        </view>
        <view class="card-hint">
          <text>每份代表你拥有这头猪的 1/{{ pig.totalShares }}。两三家拼养建议各下 1 份</text>
        </view>
      </view>

      <!-- 地址 -->
      <view class="card address-card" @tap="onPickAddress">
        <view v-if="!address" class="addr-empty">
          <text class="addr-empty-icon">📍</text>
          <text class="addr-empty-text">选择 / 新增收货地址</text>
          <text class="card-arrow">›</text>
        </view>
        <view v-else class="addr-info">
          <view class="addr-head">
            <text class="addr-name">{{ address.name }}</text>
            <text class="addr-phone">{{ address.phone }}</text>
            <text v-if="address.isDefault" class="addr-default">默认</text>
          </view>
          <text class="addr-detail">
            {{ address.province }} {{ address.city }} {{ address.district }} {{ address.detail }}
          </text>
          <text class="card-arrow addr-arrow">›</text>
        </view>
      </view>

      <!-- 费用清单 -->
      <view class="cost-card">
        <view class="cost-row">
          <text>每份单价</text>
          <text>¥{{ priceInt }}</text>
        </view>
        <view class="cost-row">
          <text>份数</text>
          <text>× {{ shares }}</text>
        </view>
        <view class="cost-divider"></view>
        <view class="cost-row total">
          <text>合计</text>
          <text class="total-amount">¥{{ totalAmount }}</text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="pay-card">
        <text class="pay-title">支付方式</text>
        <view
          v-for="opt in payOptions"
          :key="opt.value"
          :class="['pay-option', payMethod === opt.value && 'pay-option-on', opt.disabled && 'pay-option-disabled']"
          @tap="onPickPay(opt)"
        >
          <text class="pay-icon">{{ opt.icon }}</text>
          <view class="pay-info">
            <text class="pay-name">{{ opt.label }}</text>
            <text class="pay-sub">{{ opt.sub }}</text>
          </view>
          <view :class="['pay-radio', payMethod === opt.value && 'pay-radio-on']">
            <text v-if="payMethod === opt.value">✓</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="card">
        <text class="card-label">备注(选填)</text>
        <textarea
          v-model="remark"
          class="remark-input"
          placeholder="给农户的话,如:晚点屠宰、留排骨等"
          maxlength="200"
        />
      </view>

      <!-- 提示 -->
      <view v-if="payMethod === 'mock'" class="tip-card">
        <text>💡 <text class="bold">开发测试</text>使用 mock 支付,不真实扣钱。</text>
      </view>
      <view v-else-if="payMethod === 'wallet'" class="tip-card">
        <text>💳 钱包余额支付,当前余额 <text class="bold">¥{{ walletBalance }}</text></text>
      </view>
      <view v-else class="tip-card">
        <text>📱 微信支付暂未接入(待真实小程序帐号 + 商户号),将自动降级为 mock 支付。</text>
      </view>

      <view class="bottom-spacer"></view>

      <!-- 底部固定 -->
      <view class="cta-bar">
        <view class="cta-summary">
          <text class="cta-summary-label">应付</text>
          <text class="cta-summary-num">¥{{ totalAmount }}</text>
        </view>
        <view class="cta-btn" :class="submitting && 'cta-btn-disabled'" @tap="onSubmit">
          <text>{{ submitting ? '提交中…' : '提 交 订 单' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { request, getToken, ApiError } from '../../utils/request';

interface Pig {
  id: string;
  title: string;
  breed: string;
  region: string;
  coverImage: string;
  pricePerShare: string;
  totalShares: number;
  soldShares: number;
  status: string;
}
interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

const pig = ref<Pig | null>(null);
const shares = ref(1);
const address = ref<Address | null>(null);
const loading = ref(true);
const errMsg = ref('');
const submitting = ref(false);
const remark = ref('');
const walletBalance = ref('0.00');

type PayMethod = 'wallet' | 'wxpay' | 'mock';
const payMethod = ref<PayMethod>('mock');

const payOptions = computed(() => {
  const opts: Array<{ value: PayMethod; label: string; sub: string; icon: string; disabled?: boolean }> = [
    {
      value: 'wallet',
      label: '钱包余额',
      sub: `当前余额 ¥${walletBalance.value}`,
      icon: '💳',
    },
    {
      value: 'wxpay',
      label: '微信支付',
      sub: '暂未接入,将走 mock 支付',
      icon: '💚',
      disabled: false,
    },
    {
      value: 'mock',
      label: '开发 mock',
      sub: '不真实扣钱,仅记账',
      icon: '🧪',
    },
  ];
  return opts;
});

function onPickPay(opt: { value: PayMethod; disabled?: boolean }) {
  if (opt.disabled) return;
  payMethod.value = opt.value;
}

const priceInt = computed(() => (pig.value ? Math.round(parseFloat(pig.value.pricePerShare)) : 0));
const remainShares = computed(() => (pig.value ? pig.value.totalShares - pig.value.soldShares : 0));
const totalAmount = computed(() => (pig.value ? (parseFloat(pig.value.pricePerShare) * shares.value).toFixed(2) : '0.00'));

let pigIdParam = '';

function incShares() {
  if (!pig.value) return;
  if (shares.value >= remainShares.value) {
    uni.showToast({ title: '不能超过剩余份数', icon: 'none' });
    return;
  }
  shares.value++;
}
function decShares() {
  if (shares.value > 1) shares.value--;
}

async function loadPig(id: string) {
  loading.value = true;
  errMsg.value = '';
  try {
    pig.value = await request<Pig>(`/pigs/${id}`, { auth: false });
  } catch (e) {
    errMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function loadDefaultAddress() {
  if (!getToken()) return;
  try {
    const list = await request<Address[]>('/users/me/addresses');
    address.value = list.find((a) => a.isDefault) || list[0] || null;
  } catch {
    // 401 已被 request 兜底
  }
}

async function loadWallet() {
  if (!getToken()) return;
  try {
    const r = await request<{ wallet: { balance: string } }>('/wallet/me');
    walletBalance.value = r.wallet.balance;
  } catch {
    walletBalance.value = '0.00';
  }
}

function onPickAddress() {
  // 简易版:直接跳地址管理页;v1.5 做"选地址"页
  uni.navigateTo({ url: '/pages/my/addresses' });
}

async function onSubmit() {
  if (!pig.value) return;
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 600);
    return;
  }
  if (!address.value) {
    uni.showToast({ title: '请先选择收货地址', icon: 'none' });
    return;
  }
  // 钱包支付前预检
  if (payMethod.value === 'wallet') {
    if (parseFloat(walletBalance.value) < parseFloat(totalAmount.value)) {
      uni.showModal({
        title: '余额不足',
        content: `当前钱包余额 ¥${walletBalance.value},不足以支付 ¥${totalAmount.value}。是否切换为 mock 支付?`,
        confirmText: '切换',
        success: (res) => {
          if (res.confirm) payMethod.value = 'mock';
        },
      });
      return;
    }
  }

  submitting.value = true;
  try {
    // 1. 创建订单(带 addressId + remark)
    const order = await request<{ id: string }>('/orders', {
      method: 'POST',
      data: {
        pigId: pig.value.id,
        sharesCount: shares.value,
        addressId: address.value.id,
        remark: remark.value || undefined,
      },
    });

    // 2. 按支付方式调对应接口
    if (payMethod.value === 'wallet') {
      await request(`/orders/${order.id}/wallet-pay`, { method: 'POST' });
    } else {
      // wxpay 暂未接入 → 降级 mock-paid
      await request(`/orders/${order.id}/mock-paid`, { method: 'POST' });
    }

    // 3. 跳结果页
    uni.redirectTo({ url: `/pages/order/result?id=${order.id}&ok=1` });
  } catch (e) {
    submitting.value = false;
    uni.showToast({
      title: e instanceof ApiError ? e.message : '下单失败',
      icon: 'none',
      duration: 2000,
    });
  }
}

onLoad((opts: Record<string, string | undefined>) => {
  pigIdParam = opts?.pigId || '';
  if (!pigIdParam) {
    errMsg.value = '缺少 pigId';
    loading.value = false;
    return;
  }
  loadPig(pigIdParam);
});

onShow(() => {
  loadDefaultAddress();
  loadWallet();
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

.pig-row {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx;
  display: flex;
  margin-bottom: 20rpx;
}
.pig-cover {
  width: 160rpx; height: 160rpx;
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
  font-weight: 800;
  color: #1a1a1a;
}
.pig-tags {
  display: flex;
  margin: 12rpx 0;
}
.tag {
  display: inline-block;
  padding: 4rpx 14rpx;
  background: #f0e8d4;
  color: #7a1f1f;
  font-size: 20rpx;
  border-radius: 12rpx;
  margin-right: 8rpx;
}
.tag-region { background: #e8f0e2; color: #3a6d3a; }
.pig-unit-price {
  margin-top: auto;
  font-size: 24rpx;
  color: #c0392b;
  font-weight: 700;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-label {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.qty {
  display: flex;
  align-items: center;
}
.qty-btn {
  width: 64rpx; height: 64rpx;
  border-radius: 32rpx;
  background: #f5f3ec;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-btn text { font-size: 36rpx; color: #c0392b; font-weight: 800; }
.qty-num {
  font-size: 36rpx;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0 28rpx;
  min-width: 60rpx;
  text-align: center;
}
.card-hint {
  margin-top: 12rpx;
  padding-top: 16rpx;
  border-top: 2rpx dashed #f0e8d4;
}
.card-hint text {
  font-size: 22rpx;
  color: #999;
  line-height: 1.7;
}

.address-card { padding: 28rpx; }
.addr-empty {
  display: flex;
  align-items: center;
}
.addr-empty-icon { font-size: 36rpx; margin-right: 12rpx; }
.addr-empty-text {
  flex: 1;
  font-size: 28rpx;
  color: #888;
}
.card-arrow { font-size: 36rpx; color: #ccc; }
.addr-info {
  position: relative;
  padding-right: 36rpx;
  display: flex;
  flex-direction: column;
}
.addr-head {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.addr-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-right: 16rpx;
}
.addr-phone {
  font-size: 24rpx;
  color: #666;
  flex: 1;
}
.addr-default {
  font-size: 18rpx;
  color: #c0392b;
  background: #fff5e6;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
}
.addr-detail {
  font-size: 24rpx;
  color: #555;
  line-height: 1.7;
}
.addr-arrow {
  position: absolute;
  right: 0;
  top: 50%;
  margin-top: -18rpx;
}

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
  padding: 12rpx 0;
}
.cost-row text {
  font-size: 26rpx;
  color: #555;
}
.cost-divider {
  height: 2rpx;
  background: #f5f3ec;
  margin: 8rpx 0;
}
.cost-row.total text { font-size: 30rpx; font-weight: 800; color: #1a1a1a; }
.total-amount { color: #c0392b !important; font-size: 36rpx !important; }

.tip-card {
  background: rgba(192, 57, 43, 0.07);
  border-left: 6rpx solid #c0392b;
  padding: 20rpx 24rpx;
  border-radius: 0 16rpx 16rpx 0;
  margin-bottom: 24rpx;
}
.tip-card text {
  font-size: 22rpx;
  color: #5a2818;
  line-height: 1.75;
}
.tip-card .bold { color: #c0392b; font-weight: 700; }

/* ===== 支付方式 ===== */
.pay-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
}
.pay-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #1a1a1a;
  display: block;
  margin-bottom: 16rpx;
}
.pay-option {
  display: flex;
  align-items: center;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  margin-bottom: 8rpx;
  background: #fafafa;
}
.pay-option-on {
  background: rgba(192, 57, 43, 0.06);
  border-color: #c0392b;
}
.pay-option-disabled { opacity: 0.5; }
.pay-icon { font-size: 40rpx; margin-right: 16rpx; }
.pay-info { flex: 1; display: flex; flex-direction: column; }
.pay-name { font-size: 28rpx; font-weight: 700; color: #1a1a1a; }
.pay-sub { font-size: 22rpx; color: #888; margin-top: 4rpx; }
.pay-radio {
  width: 36rpx; height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pay-radio-on { background: #c0392b; border-color: #c0392b; }
.pay-radio text { color: #fff; font-size: 22rpx; font-weight: 800; }

/* ===== 备注 ===== */
.remark-input {
  width: 100%;
  min-height: 140rpx;
  background: #f5f3ec;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
  margin-top: 12rpx;
}

.bottom-spacer { height: 24rpx; }

.cta-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-top: 2rpx solid #f0e8d4;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  z-index: 100;
}
.cta-summary {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.cta-summary-label { font-size: 22rpx; color: #999; }
.cta-summary-num { font-size: 40rpx; font-weight: 800; color: #c0392b; }
.cta-btn {
  width: 320rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.36);
}
.cta-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}
.cta-btn-disabled { background: #ccc; box-shadow: none; }
</style>
