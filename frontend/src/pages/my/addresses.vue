<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="empty">
      <text class="empty-icon">📍</text>
      <text class="empty-text">还没有收货地址</text>
      <view class="empty-cta" @tap="onAdd">
        <text>+ 新增地址</text>
      </view>
    </view>

    <view v-else class="list">
      <view v-for="a in list" :key="a.id" class="addr-card">
        <view class="addr-head">
          <text class="addr-name">{{ a.name }}</text>
          <text class="addr-phone">{{ a.phone }}</text>
          <text v-if="a.isDefault" class="addr-default">默认</text>
        </view>
        <text class="addr-detail">
          {{ a.province }} {{ a.city }} {{ a.district }} {{ a.detail }}
        </text>
        <view class="addr-actions">
          <view class="addr-btn" @tap="onEdit(a)">
            <text>编辑</text>
          </view>
          <view class="addr-btn" @tap="onDelete(a)">
            <text class="del">删除</text>
          </view>
          <view v-if="!a.isDefault" class="addr-btn" @tap="onSetDefault(a)">
            <text class="primary">设为默认</text>
          </view>
        </view>
      </view>
    </view>

    <view class="add-cta" @tap="onAdd">
      <text>+ 新 增 收 货 地 址</text>
    </view>

    <!-- 编辑表单(简易内嵌弹层) -->
    <view v-if="editing" class="modal-mask" @tap="closeModal">
      <view class="modal" @tap.stop>
        <text class="modal-title">{{ editing.id ? '编辑地址' : '新增地址' }}</text>

        <view class="form-row">
          <text class="form-label">收件人</text>
          <input class="form-input" v-model="form.name" placeholder="姓名" maxlength="20" />
        </view>
        <view class="form-row">
          <text class="form-label">手机号</text>
          <input class="form-input" v-model="form.phone" placeholder="11 位手机号" type="number" maxlength="11" />
        </view>
        <view class="form-row">
          <text class="form-label">省 / 市</text>
          <input class="form-input" v-model="form.province" placeholder="如:四川" maxlength="20" />
        </view>
        <view class="form-row">
          <text class="form-label">市</text>
          <input class="form-input" v-model="form.city" placeholder="如:成都" maxlength="20" />
        </view>
        <view class="form-row">
          <text class="form-label">区 / 县</text>
          <input class="form-input" v-model="form.district" placeholder="如:武侯区(可选)" maxlength="20" />
        </view>
        <view class="form-row">
          <text class="form-label">详细</text>
          <input class="form-input" v-model="form.detail" placeholder="街道 + 门牌号" maxlength="120" />
        </view>
        <view class="form-row form-row-check" @tap="form.isDefault = !form.isDefault">
          <view :class="['checkbox', form.isDefault && 'checked']">
            <text v-if="form.isDefault">✓</text>
          </view>
          <text class="form-check-label">设为默认地址</text>
        </view>

        <view v-if="formErr" class="form-err">{{ formErr }}</view>

        <view class="modal-actions">
          <view class="modal-btn modal-btn-cancel" @tap="closeModal">
            <text>取消</text>
          </view>
          <view class="modal-btn modal-btn-save" @tap="onSave">
            <text>{{ saving ? '保存中…' : '保 存' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

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

const list = ref<Address[]>([]);
const loading = ref(true);
const editing = ref<Address | null>(null);
const saving = ref(false);
const formErr = ref('');
const form = reactive<{
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}>({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
});

async function load() {
  loading.value = true;
  try {
    list.value = await request<Address[]>('/users/me/addresses');
  } catch (e) {
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

function fillForm(a: Partial<Address>) {
  form.name = a.name ?? '';
  form.phone = a.phone ?? '';
  form.province = a.province ?? '';
  form.city = a.city ?? '';
  form.district = a.district ?? '';
  form.detail = a.detail ?? '';
  form.isDefault = a.isDefault ?? false;
}

function onAdd() {
  fillForm({});
  editing.value = { id: '' } as Address;
  formErr.value = '';
}

function onEdit(a: Address) {
  fillForm(a);
  editing.value = a;
  formErr.value = '';
}

function closeModal() {
  editing.value = null;
  formErr.value = '';
}

async function onSave() {
  formErr.value = '';
  if (!form.name) return (formErr.value = '请填收件人');
  if (!/^1[3-9]\d{9}$/.test(form.phone)) return (formErr.value = '请填正确的 11 位手机号');
  if (!form.province) return (formErr.value = '请填省份');
  if (!form.city) return (formErr.value = '请填城市');
  if (!form.detail) return (formErr.value = '请填详细地址');

  saving.value = true;
  try {
    if (editing.value?.id) {
      await request(`/users/me/addresses/${editing.value.id}`, {
        method: 'PATCH',
        data: { ...form },
      });
    } else {
      await request('/users/me/addresses', {
        method: 'POST',
        data: { ...form },
      });
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    closeModal();
    await load();
  } catch (e) {
    formErr.value = e instanceof ApiError ? `[${e.bizCode}] ${e.message}` : String(e);
  } finally {
    saving.value = false;
  }
}

async function onDelete(a: Address) {
  uni.showModal({
    title: '提示',
    content: `删除 "${a.name} ${a.detail}" ?`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request(`/users/me/addresses/${a.id}`, { method: 'DELETE' });
        uni.showToast({ title: '已删除', icon: 'success' });
        await load();
      } catch (e) {
        uni.showToast({
          title: e instanceof ApiError ? e.message : '删除失败',
          icon: 'none',
        });
      }
    },
  });
}

async function onSetDefault(a: Address) {
  try {
    await request(`/users/me/addresses/${a.id}`, {
      method: 'PATCH',
      data: { ...a, isDefault: true },
    });
    uni.showToast({ title: '已设为默认', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({
      title: e instanceof ApiError ? e.message : '操作失败',
      icon: 'none',
    });
  }
}

onShow(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding: 32rpx 32rpx 200rpx;
}
.state {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
}
.empty {
  padding: 200rpx 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon { font-size: 96rpx; }
.empty-text { color: #aaa; font-size: 28rpx; margin: 24rpx 0 32rpx; }
.empty-cta {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  padding: 20rpx 48rpx;
  border-radius: 40rpx;
}
.empty-cta text { color: #fff; font-size: 26rpx; font-weight: 700; }

.list {
  display: flex;
  flex-direction: column;
}
.addr-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.addr-head {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.addr-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-right: 20rpx;
}
.addr-phone {
  font-size: 26rpx;
  color: #666;
  flex: 1;
}
.addr-default {
  font-size: 20rpx;
  color: #c0392b;
  background: #fff5e6;
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
  font-weight: 700;
}
.addr-detail {
  font-size: 26rpx;
  color: #555;
  line-height: 1.7;
  margin-bottom: 20rpx;
  display: block;
}
.addr-actions {
  display: flex;
  border-top: 2rpx solid #f5f3ec;
  padding-top: 16rpx;
}
.addr-btn {
  margin-right: 24rpx;
  padding: 8rpx 0;
}
.addr-btn text {
  font-size: 24rpx;
  color: #666;
}
.addr-btn text.del { color: #c0392b; }
.addr-btn text.primary { color: #c0392b; font-weight: 700; }

.add-cta {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 48rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(192, 57, 43, 0.3);
}
.add-cta text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
}

/* ====== 编辑弹层 ====== */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.modal {
  width: 100%;
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  padding: 36rpx 36rpx calc(36rpx + env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 32rpx;
  display: block;
}
.form-row {
  display: flex;
  align-items: center;
  border-bottom: 2rpx solid #f0e8d4;
  padding: 20rpx 0;
}
.form-row-check {
  border-bottom: none;
  margin-top: 8rpx;
}
.form-label {
  width: 140rpx;
  font-size: 26rpx;
  color: #888;
  flex-shrink: 0;
}
.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  padding: 8rpx 0;
}
.checkbox {
  width: 36rpx; height: 36rpx;
  border: 2rpx solid #ccc;
  border-radius: 8rpx;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox.checked {
  background: #c0392b;
  border-color: #c0392b;
}
.checkbox text { color: #fff; font-size: 24rpx; font-weight: 800; }
.form-check-label { font-size: 26rpx; color: #444; }
.form-err {
  color: #c0392b;
  font-size: 24rpx;
  margin-top: 16rpx;
}
.modal-actions {
  display: flex;
  margin-top: 32rpx;
}
.modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-btn-cancel {
  background: #f5f3ec;
  margin-right: 20rpx;
}
.modal-btn-cancel text { color: #666; font-size: 28rpx; font-weight: 600; }
.modal-btn-save {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
}
.modal-btn-save text { color: #fff; font-size: 28rpx; font-weight: 800; letter-spacing: 2rpx; }
</style>
