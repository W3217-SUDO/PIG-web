<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中...</text></view>

    <view v-else class="form-card">
      <!-- #ifdef MP-WEIXIN -->
      <button class="form-row avatar-button" open-type="chooseAvatar" @chooseavatar="onChooseWechatAvatar">
        <text class="form-label">头像</text>
        <view class="avatar-wrap">
          <image v-if="form.avatarUrl" class="avatar-img" :src="form.avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-placeholder">👤</text>
        </view>
        <text class="form-arrow">›</text>
      </button>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view class="form-row" @tap="onPickAvatar">
        <text class="form-label">头像</text>
        <view class="avatar-wrap">
          <image v-if="form.avatarUrl" class="avatar-img" :src="form.avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-placeholder">👤</text>
        </view>
        <text class="form-arrow">›</text>
      </view>
      <!-- #endif -->

      <view class="form-row">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="form.nickname" type="nickname" placeholder="请输入微信昵称" maxlength="20" />
      </view>

      <view class="form-row">
        <text class="form-label">微信ID</text>
        <view class="openid-box" @tap="copyOpenid">
          <text class="openid-text">{{ openid || '登录后自动获取' }}</text>
          <text v-if="openid" class="copy-text">复制</text>
        </view>
      </view>

      <view class="form-row">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.phone" placeholder="11 位手机号(选填)" type="number" maxlength="11" />
      </view>
    </view>

    <view v-if="errMsg" class="err">{{ errMsg }}</view>

    <view class="tip-card">
      <text>微信头像和昵称需要你主动授权，平台不会自动读取未授权资料。</text>
    </view>

    <view class="save-btn" :class="{ 'save-btn-disabled': saving }" @tap="onSave">
      <text>{{ saving ? '保存中...' : '保存' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
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
const auth = useAuthStore();
const form = reactive({
  nickname: '',
  avatarUrl: '',
  phone: '',
});

async function load() {
  loading.value = true;
  try {
    const u = await request<UserInfo>('/users/me');
    openid.value = u.openid || '';
    form.nickname = u.nickname || '';
    form.avatarUrl = u.avatarUrl || '';
    form.phone = u.phone || '';
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    loading.value = false;
  }
}

async function uploadAvatar(filePath: string) {
  saving.value = true;
  errMsg.value = '';
  try {
    const asset = await uploadImage(filePath);
    form.avatarUrl = asset.url;
    uni.showToast({ title: '头像已选择', icon: 'success' });
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
    errMsg.value = '请填写昵称';
    return;
  }
  if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) {
    errMsg.value = '手机号格式不对';
    return;
  }

  saving.value = true;
  try {
    const payload: Record<string, string> = { nickname: form.nickname.trim() };
    if (form.avatarUrl) payload.avatarUrl = form.avatarUrl;
    if (form.phone) payload.phone = form.phone;

    const updated = await request<UserInfo>('/users/me', { method: 'PATCH', data: payload });
    auth.updateUser({
      id: updated.id,
      openid: updated.openid,
      nickname: updated.nickname,
      avatarUrl: updated.avatarUrl,
      phone: updated.phone || '',
      role: updated.role || auth.user?.role || 'user',
    });

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
.form-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 0 28rpx;
}
.form-row {
  min-height: 108rpx;
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 2rpx solid #f5f3ec;
}
.form-row:last-child { border-bottom: none; }
.avatar-button {
  width: 100%;
  margin: 0;
  background: transparent;
  border-radius: 0;
  box-sizing: border-box;
  text-align: left;
}
.avatar-button::after { border: none; }
.form-label {
  width: 140rpx;
  font-size: 28rpx;
  color: #888;
  flex-shrink: 0;
}
.form-input {
  flex: 1;
  height: 64rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.avatar-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.avatar-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #ddd;
}
.avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f0e8d4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}
.form-arrow {
  font-size: 34rpx;
  color: #ccc;
  margin-left: 16rpx;
}
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
.tip-card {
  margin-top: 24rpx;
  padding: 22rpx 26rpx;
  background: #fff8ea;
  border-radius: 20rpx;
}
.tip-card text {
  color: #8a6239;
  font-size: 24rpx;
  line-height: 1.6;
}
.save-btn {
  margin-top: 48rpx;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 48rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.3);
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
