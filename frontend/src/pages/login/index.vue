<template>
  <view class="page">
    <view class="hero">
      <text class="brand">🐷 私人订猪</text>
      <text class="slogan">认 一 头 猪 · 过 一 个 年</text>
    </view>

    <view class="card">
      <text class="card-title">登录后,可下单、看我的猪、管理地址</text>

      <!-- 微信一键登录(小程序 + APP 真实可用,H5 用 dev 旁路) -->
      <view class="btn-wx" @tap="onWxLogin">
        <text class="btn-wx-icon">💚</text>
        <text class="btn-wx-text">微 信 一 键 登 录</text>
      </view>

      <!-- 开发环境旁路 -->
      <view class="dev-section">
        <text class="dev-label">— 开发测试通道 —</text>
        <view class="btn-dev" @tap="onDevLogin">
          <text>{{ devLoading ? '登录中…' : 'dev 一键登录(自动建测试号)' }}</text>
        </view>
        <view class="btn-dev" style="margin-top:16rpx;border-color:#888" @tap="onDiagnose">
          <text style="color:#888">🔍 诊断小程序 AppID</text>
        </view>
      </view>

      <view v-if="errMsg" class="err">{{ errMsg }}</view>
      <view v-if="diagInfo" class="err" style="color:#444;background:#fff5e6;padding:16rpx;border-radius:12rpx;margin-top:16rpx;font-size:22rpx;line-height:1.6;text-align:left">
        <text>{{ diagInfo }}</text>
      </view>
    </view>

    <!-- 其他身份入口 -->
    <view class="role-entries">
      <view class="role-entry" @tap="goFoster">
        <text class="role-icon">🧑‍🌾</text>
        <text class="role-text">我是代养人</text>
        <text class="role-arrow">→</text>
      </view>
      <view class="role-entry" @tap="goAdmin">
        <text class="role-icon">🛡</text>
        <text class="role-text">管理员入口</text>
        <text class="role-arrow">→</text>
      </view>
    </view>

    <view class="footer">
      <text class="footer-tip">登录即表示同意</text>
      <text class="footer-link" @tap="goStatic('terms')">《用户协议》</text>
      <text class="footer-tip">和</text>
      <text class="footer-link" @tap="goStatic('privacy')">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { request, setToken, ApiError } from '../../utils/request';

interface LoginResp {
  user: { id: string; openid: string; nickname: string; role: string };
  access_token: string;
  refresh_token: string;
}

const devLoading = ref(false);
const errMsg = ref('');
const diagInfo = ref('');

function onDiagnose() {
  // #ifdef MP-WEIXIN
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = (uni as any).getAccountInfoSync?.() || {};
    const mp = info.miniProgram || {};
    diagInfo.value =
      `运行时 AppID: ${mp.appId || '(无)'}\n` +
      `环境: ${mp.envVersion || '?'}\n` +
      `版本: ${mp.version || '-'}\n` +
      `期望 AppID: wx4409bb388ab1a03e\n` +
      `是否一致: ${mp.appId === 'wx4409bb388ab1a03e' ? '✅ 一致' : '❌ 不一致, 这是登录失败的原因!'}`;
  } catch (e) {
    diagInfo.value = `getAccountInfoSync 失败: ${String(e)}`;
  }
  return;
  // #endif
  diagInfo.value = '此功能仅小程序端可用';
}

async function onWxLogin() {
  // #ifdef MP-WEIXIN
  uni.showLoading({ title: '登录中' });
  try {
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (r) => resolve(r.code),
        fail: (e) => reject(e),
      });
    });
    const data = await request<LoginResp>('/auth/wx-login', {
      method: 'POST',
      data: { code },
      auth: false,
    });
    setToken(data.access_token);
    uni.hideLoading();
    uni.reLaunch({ url: '/pages/index/index' });
  } catch (e) {
    uni.hideLoading();
    // 本地开发: AppSecret 未配置时自动走 dev-login
    const msg = e instanceof ApiError ? e.message : String(e);
    if (msg.includes('appid/secret') || msg.includes('占位') || msg.includes('BadGateway') || (e instanceof ApiError && e.bizCode === 502)) {
      await onDevLogin();
    } else {
      errMsg.value = msg;
    }
  }
  return;
  // #endif

  // H5 / 其他: 用 dev-login 兜底
  await onDevLogin();
}

async function onDevLogin() {
  devLoading.value = true;
  errMsg.value = '';
  try {
    const data = await request<LoginResp>('/auth/dev-login', {
      method: 'POST',
      data: {},
      auth: false,
    });
    setToken(data.access_token);
    uni.showToast({ title: '登录成功', icon: 'success', duration: 800 });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' });
    }, 600);
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    devLoading.value = false;
  }
}

function goStatic(name: 'terms' | 'privacy') {
  uni.navigateTo({ url: `/pages/static/${name}` });
}

function goFoster() {
  uni.navigateTo({ url: '/pages/foster/login/index' });
}

function goAdmin() {
  uni.navigateTo({ url: '/pages/admin/login' });
}
</script>

<style>
.page {
  min-height: 100vh;
  background: linear-gradient(165deg, #2c1810 0%, #5a2818 60%, #8b3a1a 100%);
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.hero {
  text-align: center;
  padding: 60rpx 0 80rpx;
}
.brand {
  font-size: 56rpx;
  font-weight: 800;
  color: #ffd89c;
  letter-spacing: 6rpx;
  display: block;
}
.slogan {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 8rpx;
  margin-top: 20rpx;
  display: block;
}
.card {
  background: #fff;
  border-radius: 36rpx;
  padding: 48rpx 36rpx;
  box-shadow: 0 16rpx 60rpx rgba(0, 0, 0, 0.25);
}
.card-title {
  font-size: 26rpx;
  color: #666;
  text-align: center;
  display: block;
  margin-bottom: 40rpx;
}
.btn-wx {
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: 52rpx;
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.3);
}
.btn-wx-icon { font-size: 36rpx; margin-right: 16rpx; }
.btn-wx-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}
.dev-section {
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 2rpx dashed #eee;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dev-label {
  font-size: 20rpx;
  color: #999;
  letter-spacing: 4rpx;
  margin-bottom: 20rpx;
}
.btn-dev {
  width: 100%;
  border: 2rpx dashed #c0392b;
  border-radius: 40rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-dev text {
  color: #c0392b;
  font-size: 24rpx;
  font-weight: 600;
}
.err {
  color: #c0392b;
  font-size: 22rpx;
  margin-top: 24rpx;
  text-align: center;
  word-break: break-all;
}
.role-entries {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.role-entry {
  background: rgba(255, 255, 255, 0.08);
  border: 2rpx solid rgba(255, 216, 156, 0.3);
  border-radius: 36rpx;
  padding: 20rpx 32rpx;
  display: flex;
  align-items: center;
}
.role-icon { font-size: 32rpx; margin-right: 16rpx; }
.role-text {
  flex: 1;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  letter-spacing: 2rpx;
}
.role-arrow {
  font-size: 28rpx;
  color: #ffd89c;
}

.footer {
  margin-top: auto;
  padding-top: 60rpx;
  text-align: center;
}
.footer-tip { font-size: 22rpx; color: rgba(255, 255, 255, 0.55); }
.footer-link { font-size: 22rpx; color: #ffd89c; }
</style>
