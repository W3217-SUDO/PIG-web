<template>
  <view class="page">
    <view class="hero">
      <text class="lock">🛡</text>
      <text class="brand">PIG 管理后台</text>
      <text class="sub">仅限授权管理员登录</text>
    </view>

    <view class="card">
      <view class="form-row">
        <text class="label">手机号</text>
        <input
          class="input"
          type="number"
          maxlength="11"
          placeholder="11 位手机号"
          v-model="phone"
        />
      </view>

      <view class="form-row">
        <text class="label">密码</text>
        <input
          class="input"
          :password="true"
          maxlength="64"
          placeholder="密码"
          v-model="password"
        />
      </view>

      <view class="btn-login" :class="{ disabled: loading }" @tap="onSubmit">
        <text>{{ loading ? '登录中…' : '登 录' }}</text>
      </view>

      <view v-if="errMsg" class="err">
        <text>{{ errMsg }}</text>
      </view>
    </view>

    <view class="back-row" @tap="goBack">
      <text class="back-text">← 返回</text>
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

const phone = ref('');
const password = ref('');
const loading = ref(false);
const errMsg = ref('');

async function onSubmit() {
  errMsg.value = '';
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    errMsg.value = '请输入正确的 11 位手机号';
    return;
  }
  if (password.value.length < 6) {
    errMsg.value = '密码至少 6 位';
    return;
  }

  loading.value = true;
  try {
    const data = await request<LoginResp>('/auth/admin-login', {
      method: 'POST',
      data: { phone: phone.value, password: password.value },
      auth: false,
    });
    if (data.user.role !== 'admin') {
      errMsg.value = '该账号不是管理员';
      return;
    }
    setToken(data.access_token);
    uni.setStorageSync('pig:user_role', data.user.role);
    uni.showToast({ title: '登录成功', icon: 'success', duration: 800 });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/foster/admin/index' });
    }, 600);
  } catch (e) {
    errMsg.value = e instanceof ApiError ? e.message : '登录失败,请重试';
  } finally {
    loading.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}
</script>

<style>
.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1a2332 0%, #2c3e50 60%, #34495e 100%);
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.hero {
  text-align: center;
  padding: 80rpx 0 60rpx;
}
.lock {
  font-size: 80rpx;
  display: block;
  margin-bottom: 24rpx;
}
.brand {
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 4rpx;
  display: block;
}
.sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 4rpx;
  margin-top: 16rpx;
  display: block;
}
.card {
  background: #fff;
  border-radius: 32rpx;
  padding: 48rpx 36rpx;
  box-shadow: 0 16rpx 60rpx rgba(0, 0, 0, 0.35);
}
.form-row {
  margin-bottom: 28rpx;
}
.label {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}
.input {
  width: 100%;
  height: 84rpx;
  background: #f5f6f8;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  box-sizing: border-box;
}
.btn-login {
  margin-top: 12rpx;
  background: linear-gradient(135deg, #2c3e50, #34495e);
  border-radius: 44rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(44, 62, 80, 0.4);
}
.btn-login text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
}
.btn-login.disabled {
  opacity: 0.6;
}
.err {
  margin-top: 24rpx;
  color: #c0392b;
  font-size: 24rpx;
  text-align: center;
}
.back-row {
  margin-top: auto;
  padding-top: 60rpx;
  text-align: center;
}
.back-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 2rpx;
}
</style>
