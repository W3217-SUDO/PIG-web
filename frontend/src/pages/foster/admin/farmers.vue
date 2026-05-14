<template>
  <view class="page">
    <!-- 列表 -->
    <view v-if="!showForm">
      <view class="add-bar">
        <button class="btn-add" @tap="openAdd">＋ 添加新农户</button>
      </view>

      <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
      <view v-else-if="!farmers.length" class="center">
        <text class="empty">暂无农户，点击上方按钮添加</text>
      </view>

      <view v-for="f in farmers" :key="f.id" class="card">
        <view class="card-top">
          <view class="avatar-text">{{ f.name.slice(0,1) }}</view>
          <view class="info">
            <text class="name">{{ f.name }}</text>
            <text class="meta">{{ f.region }} · 散养 {{ f.years }} 年</text>
            <text class="meta gray2">{{ f.story ? f.story.slice(0,30) + '…' : '暂无简介' }}</text>
          </view>
        </view>
        <view class="btn-row">
          <view class="btn-edit" @tap="openEdit(f)"><text>✏️ 编辑</text></view>
          <view class="btn-del" @tap="doDelete(f.id, f.name)"><text>🗑️ 删除</text></view>
        </view>
      </view>
    </view>

    <!-- 表单 -->
    <view v-else class="form">
      <text class="form-title">{{ isEdit ? '编辑农户' : '新增农户' }}</text>

      <view class="field">
        <text class="label">姓名 *</text>
        <input class="input" v-model="form.name" placeholder="例：老李" />
      </view>
      <view class="field">
        <text class="label">地区 *</text>
        <input class="input" v-model="form.region" placeholder="例：广元" />
      </view>
      <view class="field">
        <text class="label">散养年限</text>
        <input class="input" v-model="form.years" type="number" placeholder="例：18" />
      </view>
      <view class="field">
        <text class="label">头像 URL</text>
        <input class="input" v-model="form.avatarUrl" placeholder="粘贴图片链接（可选）" />
      </view>
      <view class="field">
        <text class="label">农户故事</text>
        <textarea class="textarea" v-model="form.story" placeholder="介绍农户背景（可选）" />
      </view>
      <view class="field">
        <text class="label">介绍视频 URL</text>
        <input class="input" v-model="form.videoUrl" placeholder="视频链接（可选）" />
      </view>

      <view class="form-btns">
        <view class="btn-cancel" @tap="cancelForm"><text>取消</text></view>
        <view class="btn-save" @tap="doSave">
          <text>{{ saving ? '保存中…' : '✓ 保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { request } from '../../../utils/fosterRequest';

interface Farmer {
  id: string; name: string; region: string; years: number;
  avatarUrl: string; story: string | null; videoUrl: string;
}

const farmers = ref<Farmer[]>([]);
const loading = ref(true);
const showForm = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const editId = ref('');

const form = reactive({
  name: '', region: '', years: 0, avatarUrl: '', story: '', videoUrl: ''
});

onMounted(load);

async function load() {
  loading.value = true;
  try {
    farmers.value = await request<Farmer[]>('/foster/admin/farmers');
  } catch { uni.showToast({ title: '加载失败', icon: 'none' }); }
  finally { loading.value = false; }
}

function openAdd() {
  isEdit.value = false; editId.value = '';
  Object.assign(form, { name: '', region: '', years: 0, avatarUrl: '', story: '', videoUrl: '' });
  showForm.value = true;
}

function openEdit(f: Farmer) {
  isEdit.value = true; editId.value = f.id;
  Object.assign(form, { name: f.name, region: f.region, years: f.years,
    avatarUrl: f.avatarUrl || '', story: f.story || '', videoUrl: f.videoUrl || '' });
  showForm.value = true;
}

function cancelForm() { showForm.value = false; }

async function doSave() {
  if (!form.name.trim() || !form.region.trim()) {
    uni.showToast({ title: '姓名和地区必填', icon: 'none' }); return;
  }
  saving.value = true;
  try {
    const payload = { ...form, years: Number(form.years) };
    if (isEdit.value) {
      await request(`/foster/admin/farmers/${editId.value}`, { method: 'PATCH', data: payload });
    } else {
      await request('/foster/admin/farmers', { method: 'POST', data: payload });
    }
    uni.showToast({ title: isEdit.value ? '更新成功' : '添加成功', icon: 'success' });
    showForm.value = false;
    await load();
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally { saving.value = false; }
}

async function doDelete(id: string, name: string) {
  const confirmed = await new Promise<boolean>(resolve => {
    uni.showModal({ title: '确认删除', content: `确定删除农户"${name}"吗？`,
      success: r => resolve(r.confirm) });
  });
  if (!confirmed) return;
  try {
    await request(`/foster/admin/farmers/${id}`, { method: 'DELETE' });
    uni.showToast({ title: '删除成功', icon: 'success' });
    await load();
  } catch (e: any) {
    uni.showToast({ title: e.message || '删除失败', icon: 'none' });
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 40rpx; }
.add-bar { padding: 24rpx 32rpx; }
.btn-add { background: #2d8a4e; color: #fff; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; height: 80rpx; line-height: 80rpx; }
.center { padding: 80rpx 40rpx; text-align: center; }
.gray { color: #aaa; font-size: 28rpx; }
.empty { font-size: 28rpx; color: #aaa; }
.card { margin: 0 32rpx 20rpx; background: #fff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.card-top { display: flex; align-items: center; margin-bottom: 20rpx; }
.avatar-text { width: 80rpx; height: 80rpx; border-radius: 40rpx; background: #2d8a4e; color: #fff; font-size: 32rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 20rpx; flex-shrink: 0; }
.info { flex: 1; }
.name { font-size: 30rpx; font-weight: 700; color: #222; display: block; }
.meta { font-size: 24rpx; color: #666; display: block; margin-top: 4rpx; }
.gray2 { color: #aaa; font-size: 22rpx; }
.btn-row { display: flex; gap: 16rpx; }
.btn-edit, .btn-del { flex: 1; height: 64rpx; border-radius: 32rpx; display: flex; align-items: center; justify-content: center; }
.btn-edit { background: #e8f4ff; }
.btn-edit text { font-size: 26rpx; color: #1890ff; font-weight: 500; }
.btn-del { background: #fff1f0; }
.btn-del text { font-size: 26rpx; color: #ff4d4f; font-weight: 500; }
.form { margin: 24rpx 32rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.form-title { font-size: 34rpx; font-weight: 700; color: #222; display: block; margin-bottom: 32rpx; }
.field { margin-bottom: 24rpx; }
.label { font-size: 26rpx; color: #555; display: block; margin-bottom: 10rpx; font-weight: 500; }
.input { border: 2rpx solid #eee; border-radius: 12rpx; height: 80rpx; padding: 0 24rpx; font-size: 28rpx; color: #333; background: #fafafa; }
.textarea { border: 2rpx solid #eee; border-radius: 12rpx; min-height: 160rpx; padding: 20rpx 24rpx; font-size: 28rpx; color: #333; background: #fafafa; width: 100%; box-sizing: border-box; }
.form-btns { display: flex; gap: 20rpx; margin-top: 32rpx; }
.btn-cancel { flex: 1; height: 88rpx; border-radius: 44rpx; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; }
.btn-cancel text { font-size: 28rpx; color: #888; }
.btn-save { flex: 2; height: 88rpx; border-radius: 44rpx; background: #2d8a4e; display: flex; align-items: center; justify-content: center; }
.btn-save text { font-size: 30rpx; color: #fff; font-weight: 700; }
</style>
