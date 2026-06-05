<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中...</text></view>

    <view v-else>
      <view class="auth-card">
        <text class="auth-title">微信一键授权资料</text>
        <text class="auth-sub">微信ID已自动获取，头像、昵称、手机号需要你主动确认授权。</text>

        <view class="profile-preview">
          <image
            v-if="form.avatarUrl && !avatarLoadFailed"
            class="preview-avatar"
            :src="form.avatarUrl"
            mode="aspectFill"
            @error="avatarLoadFailed = true"
          />
          <view v-else class="preview-avatar placeholder"><text>👤</text></view>
          <view class="preview-meta">
            <text class="preview-name">{{ form.nickname || '未设置昵称' }}</text>
            <text class="preview-id">ID: {{ shortOpenid }}</text>
          </view>
        </view>

        <!-- #ifdef MP-WEIXIN -->
        <button class="auth-btn avatar-auth" open-type="chooseAvatar" @chooseavatar="onChooseWechatAvatar">
          <text>{{ form.avatarUrl ? '重新授权微信头像' : '授权微信头像' }}</text>
        </button>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <view class="auth-btn avatar-auth" @tap="onPickAvatar">
          <text>{{ form.avatarUrl ? '重新选择头像' : '选择头像' }}</text>
        </view>
        <!-- #endif -->

        <view class="nickname-row">
          <text class="nickname-label">微信昵称</text>
          <input class="nickname-input" v-model="form.nickname" type="nickname" placeholder="点击填写微信昵称" maxlength="20" />
        </view>

        <!-- #ifdef MP-WEIXIN -->
        <button class="auth-btn phone-auth" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
          <text>{{ form.phone ? `已绑定 ${maskedPhone}` : '授权微信手机号' }}</text>
        </button>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <view class="nickname-row">
          <text class="nickname-label">手机号</text>
          <input class="nickname-input" v-model="form.phone" placeholder="11 位手机号(选填)" type="number" maxlength="11" />
        </view>
        <!-- #endif -->
      </view>

      <view class="form-card">
        <view class="form-row">
          <text class="form-label">微信ID</text>
          <view class="openid-box" @tap="copyOpenid">
            <text class="openid-text">{{ openid || '登录后自动获取' }}</text>
            <text v-if="openid" class="copy-text">复制</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="errMsg" class="err">{{ errMsg }}</view>

    <view class="save-btn" :class="{ 'save-btn-disabled': saving }" @tap="onSave">
      <text>{{ saving ? '保存中...' : '保存并进入' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request, ApiError, uploadImage } from '../../utils/request';
import { useAuthStore } from '../../stores/auth';

interface UserInfo {
  id: string;
  openid: string;
  nickname: string;
  avatarUrl: string;
  phone: string | null;
  role?: string;
}

const loading = ref(true);
const saving = ref(false);
const errMsg = ref('');
const openid = ref('');
const fromLogin = ref(false);
const avatarLoadFailed = ref(false);
const auth = useAuthStore();
const form = reactive({
  nickname: '',
  avatarUrl: '',
  phone: '',
});

const shortOpenid = computed(() => (openid.value ? openid.value.slice(0, 12) : '自动获取中'));
const maskedPhone = computed(() => (form.phone ? `${form.phone.slice(0, 3)}****${form.phone.slice(7)}` : ''));

async function load() {
  loading.value = true;
  try {
    const u = await request<UserInfo>('/users/me');
    applyUser(u);
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    loading.value = false;
  }
}

function applyUser(u: UserInfo) {
  openid.value = u.openid || '';
  form.nickname = u.nickname || '';
  form.avatarUrl = u.avatarUrl || '';
  form.phone = u.phone || '';
  avatarLoadFailed.value = false;
  auth.updateUser({
    id: u.id,
    openid: u.openid,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl,
    phone: u.phone || '',
    role: u.role || auth.user?.role || 'user',
  });
}

async function uploadAvatar(filePath: string) {
  saving.value = true;
  errMsg.value = '';
  avatarLoadFailed.value = false;
  form.avatarUrl = filePath;
  try {
    const asset = await uploadImage(filePath);
    form.avatarUrl = asset.url;
    avatarLoadFailed.value = false;
    uni.showToast({ title: '头像已授权', icon: 'success' });
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    saving.value = false;
  }
}

function onChooseWechatAvatar(e: { detail?: { avatarUrl?: string } }) {
  const filePath = e.detail?.avatarUrl;
  if (filePath) uploadAvatar(filePath);
}

function onPickAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const filePath = res.tempFilePaths?.[0];
      if (filePath) uploadAvatar(filePath);
    },
  });
}

async function onGetPhoneNumber(e: { detail?: { code?: string; errMsg?: string } }) {
  const code = e.detail?.code;
  if (!code) {
    errMsg.value = e.detail?.errMsg?.includes('deny') ? '你已取消手机号授权' : '没有拿到微信手机号授权码';
    return;
  }

  saving.value = true;
  errMsg.value = '';
  try {
    const updated = await request<UserInfo>('/users/me/wechat-phone', {
      method: 'POST',
      data: { code },
    });
    applyUser(updated);
    uni.showToast({ title: '手机号已授权', icon: 'success' });
  } catch (e2) {
    errMsg.value = e2 instanceof ApiError ? `[${e2.bizCode}] ${e2.message}` : String(e2);
  } finally {
    saving.value = false;
  }
}

function copyOpenid() {
  if (!openid.value) return;
  uni.setClipboardData({
    data: openid.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  });
}

async function onSave() {
  if (saving.value) return;
  errMsg.value = '';

  if (!form.nickname.trim()) {
    errMsg.value = '请先填写微信昵称';
    return;
  }
  if (!form.avatarUrl) {
    errMsg.value = '请先授权微信头像';
    return;
  }
  if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) {
    errMsg.value = '手机号格式不对';
    return;
  }

  saving.value = true;
  try {
    const payload: Record<string, string> = { nickname: form.nickname.trim(), avatarUrl: form.avatarUrl };
    if (form.phone) payload.phone = form.phone;

    const updated = await request<UserInfo>('/users/me', { method: 'PATCH', data: payload });
    applyUser(updated);

    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      if (fromLogin.value) {
        uni.reLaunch({ url: '/pages/index/index' });
      } else {
        uni.navigateBack();
      }
    }, 600);
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    saving.value = false;
  }
}

onLoad((query) => {
  fromLogin.value = query?.fromLogin === '1';
});

onMounted(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding: 32rpx;
}
.state {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
}
.auth-card,
.form-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
}
.auth-title {
  display: block;
  font-size: 34rpx;
  color: #1a1a1a;
  font-weight: 800;
}
.auth-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8a6239;
  line-height: 1.5;
}
.profile-preview {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
  padding: 24rpx;
  background: #fff8ea;
  border-radius: 24rpx;
}
.preview-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  background: #ead7bd;
  flex-shrink: 0;
}
.preview-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-avatar.placeholder text {
  font-size: 52rpx;
}
.preview-meta {
  min-width: 0;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.preview-name {
  font-size: 32rpx;
  color: #1a1a1a;
  font-weight: 800;
}
.preview-id {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #777;
}
.auth-btn {
  width: 100%;
  height: 88rpx;
  margin: 24rpx 0 0;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-sizing: border-box;
}
.auth-btn::after { border: none; }
.auth-btn text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}
.avatar-auth {
  background: linear-gradient(135deg, #07c160, #06ad56);
}
.phone-auth {
  background: linear-gradient(135deg, #c0392b, #e36a34);
}
.nickname-row,
.form-row {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  border-bottom: 2rpx solid #f5f3ec;
}
.nickname-row {
  margin-top: 10rpx;
}
.nickname-label,
.form-label {
  width: 140rpx;
  font-size: 28rpx;
  color: #888;
  flex-shrink: 0;
}
.nickname-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.form-card {
  margin-top: 24rpx;
}
.form-row:last-child { border-bottom: none; }
.openid-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
}
.openid-text {
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;
  color: #666;
}
.copy-text {
  font-size: 24rpx;
  color: #c0392b;
  font-weight: 700;
}
.err {
  color: #c0392b;
  font-size: 24rpx;
  margin-top: 16rpx;
  text-align: center;
}
.save-btn {
  margin-top: 48rpx;
  background: linear-gradient(135deg, #2c1810, #8b3a1a);
  border-radius: 48rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(44, 24, 16, 0.25);
}
.save-btn text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}
.save-btn-disabled {
  background: #ccc;
  box-shadow: none;
}
</style>
