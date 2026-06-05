<template>
  <view class="page">
    <view class="hero">
      <text class="brand">🐷 私人订猪</text>
      <text class="slogan">认 一 头 猪 · 过 一 个 年</text>
    </view>

    <view class="card">
      <text class="card-title">登录后,可下单、看我的猪、管理地址</text>

      <!-- 微信一键登录(小程序 + APP 真实可用,H5 用 dev 旁路) -->
      <view class="btn-wx" :class="{ disabled: wxLoading }" @tap="onWxLogin">
        <text class="btn-wx-icon">💚</text>
        <text class="btn-wx-text">{{ wxLoading ? '登 录 中…' : '微 信 一 键 登 录' }}</text>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <view class="btn-diagnose" @tap="onDiagnose">
        <text>🔍 诊断小程序 AppID</text>
      </view>
      <!-- #endif -->

      <!-- 开发环境旁路 -->
      <!-- #ifndef MP-WEIXIN -->
      <view v-if="showDevTools" class="dev-section">
        <text class="dev-label">— 开发测试通道 —</text>
        <view class="btn-dev" @tap="onDevLogin">
          <text>{{ devLoading ? '登录中…' : 'dev 一键登录(自动建测试号)' }}</text>
        </view>
        <view class="btn-dev" style="margin-top:16rpx;border-color:#888" @tap="onDiagnose">
          <text style="color:#888">🔍 诊断小程序 AppID</text>
        </view>
      </view>
      <!-- #endif -->

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
import { request, ApiError, API_BASE_URL } from '../../utils/request';
import { useAuthStore } from '../../stores/auth';

interface LoginResp {
  user: { id: string; openid: string; nickname: string; role: string };
  access_token: string;
  refresh_token: string;
}

const devLoading = ref(false);
const wxLoading = ref(false);
const errMsg = ref('');
const diagInfo = ref('');
const auth = useAuthStore();
const isProdBuild = import.meta.env.MODE === 'production';
const showDevTools = !isProdBuild;

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
      `期望 AppID: wx7aaf3180b690e871\n` +
      `API: ${API_BASE_URL}\n` +
      `是否一致: ${mp.appId === 'wx7aaf3180b690e871' ? '✅ 一致' : '❌ 不一致, 这是登录失败的原因!'}`;
  } catch (e) {
    diagInfo.value = `getAccountInfoSync 失败: ${String(e)}`;
  }
  return;
  // #endif
  diagInfo.value = '此功能仅小程序端可用';
}

async function onWxLogin() {
  // #ifdef MP-WEIXIN
  if (wxLoading.value) return;
  wxLoading.value = true;
  errMsg.value = '';
  diagInfo.value = '';
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
    auth.setSession(data);
    uni.hideLoading();
    uni.reLaunch({ url: '/pages/index/index' });
  } catch (e) {
    uni.hideLoading();
    // 本地开发: AppSecret 未配置时自动走 dev-login
    const msg = e instanceof ApiError ? e.message : String(e);
    if (!isProdBuild && shouldFallbackToDevLogin(msg, e)) {
      await onDevLogin();
    } else {
      errMsg.value = formatWxLoginError(msg);
    }
  } finally {
    wxLoading.value = false;
  }
  return;
  // #endif

  if (isProdBuild) {
    uni.showModal({
      title: '请使用微信小程序登录',
      content: '正式环境暂不开放网页登录，请在微信小程序内完成登录和认养。',
      showCancel: false,
    });
    return;
  }

  // H5 / 其他: 用 dev-login 兜底
  await onDevLogin();
}

function formatWxLoginError(msg: string): string {
  if (msg.includes('invalid code')) {
    return '微信登录 code 已失效。请点“诊断小程序 AppID”确认 AppID 一致，然后重新编译/预览小程序，再重新点一次微信登录。';
  }
  return msg;
}

function shouldFallbackToDevLogin(msg: string, e: unknown): boolean {
  return (
    msg.includes('appid/secret') ||
    msg.includes('占位') ||
    msg.includes('BadGateway') ||
    msg.includes('invalid code') ||
    (e instanceof ApiError && e.bizCode === 502)
  );
}

async function onDevLogin() {
  if (isProdBuild) {
    errMsg.value = '正式环境已关闭开发测试登录';
    return;
  }

  devLoading.value = true;
  errMsg.value = '';
  try {
    const data = await request<LoginResp>('/auth/dev-login', {
      method: 'POST',
      data: {},
      auth: false,
    });
    auth.setSession(data);
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
.btn-wx.disabled {
  opacity: 0.72;
}
.btn-wx-icon { font-size: 36rpx; margin-right: 16rpx; }
.btn-wx-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}
.btn-diagnose {
  margin-top: 24rpx;
  height: 72rpx;
  border: 2rpx dashed #b8a182;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-diagnose text {
  color: #6b4a2f;
  font-size: 24rpx;
  font-weight: 600;
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
