<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>

    <view v-else class="form-card">
      <view class="form-row" @tap="onPickAvatar">
        <text class="form-label">头像</text>
        <view class="avatar-wrap">
          <image v-if="form.avatarUrl" class="avatar-img" :src="form.avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-placeholder">👤</text>
        </view>
        <text class="form-arrow">›</text>
      </view>
      <view class="form-row">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="form.nickname" placeholder="给自己取个名字" maxlength="20" />
      </view>
      <view class="form-row">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.phone" placeholder="11 位手机号(选填)" type="number" maxlength="11" />
      </view>
    </view>

    <view v-if="errMsg" class="err">{{ errMsg }}</view>

    <view class="save-btn" :class="saving && 'save-btn-disabled'" @tap="onSave">
      <text>{{ saving ? '保存中…' : '保 存' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { request, ApiError } from '../../utils/request';

interface UserInfo {
  id: string;
  nickname: string;
  avatarUrl: string;
  phone: string | null;
}

const loading = ref(true);
const saving = ref(false);
const errMsg = ref('');
const form = reactive<{
  nickname: string;
  avatarUrl: string;
  phone: string;
}>({
  nickname: '',
  avatarUrl: '',
  phone: '',
});

async function load() {
  loading.value = true;
  try {
    const u = await request<UserInfo>('/users/me');
    form.nickname = u.nickname || '';
    form.avatarUrl = u.avatarUrl || '';
    form.phone = u.phone || '';
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    loading.value = false;
  }
}

function onPickAvatar() {
  uni.showToast({ title: '头像上传(S6 实现)', icon: 'none' });
}

async function onSave() {
  errMsg.value = '';
  if (!form.nickname.trim()) {
    errMsg.value = '请填昵称';
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
    await request('/users/me', { method: 'PATCH', data: payload });
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  } catch (e) {
    errMsg.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    saving.value = false;
  }
}

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
  display: flex;
  align-items: center;
  padding: 32rpx 0;
  border-bottom: 2rpx solid #f5f3ec;
}
.form-row:last-child { border-bottom: none; }
.form-label {
  width: 140rpx;
  font-size: 28rpx;
  color: #888;
  flex-shrink: 0;
}
.form-input {
  flex: 1;
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
  width: 88rpx; height: 88rpx;
  border-radius: 50%;
  background: #ddd;
}
.avatar-placeholder {
  width: 88rpx; height: 88rpx;
  border-radius: 50%;
  background: #f0e8d4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}
.form-arrow { font-size: 32rpx; color: #ccc; margin-left: 16rpx; }

.err {
  color: #c0392b;
  font-size: 24rpx;
  margin-top: 16rpx;
  text-align: center;
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
.save-btn-disabled { background: #ccc; box-shadow: none; }
</style>
