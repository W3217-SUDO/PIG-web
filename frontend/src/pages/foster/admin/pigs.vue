<template>
  <view class="page">
    <!-- 列表 -->
    <view v-if="!showForm">
      <view class="toolbar">
        <button class="btn-add" @tap="openAdd">＋ 添加猪只</button>
      </view>

      <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
      <view v-else-if="!pigs.length" class="center">
        <text class="empty">暂无猪只，点击上方按钮添加</text>
      </view>

      <view v-for="p in pigs" :key="p.id" class="card">
        <view class="card-top">
          <view class="pig-avatar">🐷</view>
          <view class="info">
            <text class="pig-name">{{ p.title }}</text>
            <text class="pig-meta">{{ p.breed }} · {{ p.farmerName }} · {{ p.region }}</text>
            <text class="pig-meta">{{ p.weightKg }} kg · ¥{{ p.pricePerShare }}/份 · {{ p.soldShares }}/{{ p.totalShares }}份</text>
          </view>
          <view class="status-badge" :class="p.status">
            <text>{{ statusLabel(p.status) }}</text>
          </view>
        </view>
        <view class="btn-row">
          <view class="btn-edit" @tap="openEdit(p)"><text>✏️ 编辑</text></view>
          <view class="btn-toggle" @tap="toggleStatus(p)">
            <text>{{ p.status === 'listed' ? '⬇️ 下架' : '⬆️ 上架' }}</text>
          </view>
          <view class="btn-del" @tap="doDelete(p.id, p.title)"><text>🗑️ 删除</text></view>
        </view>
      </view>
    </view>

    <!-- 表单 -->
    <view v-else class="form">
      <text class="form-title">{{ isEdit ? '编辑猪只' : '新增猪只' }}</text>

      <view class="field">
        <text class="label">名称 *（例：黑土豚·老李一号）</text>
        <input class="input" v-model="form.title" placeholder="猪只名称" />
      </view>
      <view class="field">
        <text class="label">品种</text>
        <input class="input" v-model="form.breed" placeholder="例：黑土猪" />
      </view>
      <view class="field">
        <text class="label">所属农户 *</text>
        <picker :range="farmerNames" :value="farmerIndex" @change="onPickFarmer">
          <view class="picker-view">
            <text>{{ farmerIndex >= 0 ? farmerNames[farmerIndex] : '请选择农户' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>
      <view class="field">
        <text class="label">地区</text>
        <input class="input" v-model="form.region" placeholder="例：广元" />
      </view>
      <view class="field">
        <text class="label">当前体重(kg)</text>
        <input class="input" v-model="form.weightKg" type="digit" placeholder="例：38.5" />
      </view>
      <view class="field">
        <text class="label">预期出栏体重(kg)</text>
        <input class="input" v-model="form.expectedWeightKg" type="digit" placeholder="例：150" />
      </view>
      <view class="field">
        <text class="label">每份价格(元)</text>
        <input class="input" v-model="form.pricePerShare" type="digit" placeholder="例：830" />
      </view>
      <view class="field">
        <text class="label">总份数</text>
        <input class="input" v-model="form.totalShares" type="number" placeholder="例：10" />
      </view>
      <view class="field">
        <text class="label">封面图 URL</text>
        <input class="input" v-model="form.coverImage" placeholder="图片链接（可选）" />
      </view>
      <view class="field">
        <text class="label">简介</text>
        <textarea class="textarea" v-model="form.description" placeholder="猪只介绍（可选）" />
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
import { ref, reactive, computed, onMounted } from 'vue';
import { request, getFarmerId } from '../../../utils/fosterRequest';

interface Pig {
  id: string; title: string; breed: string; farmerId: string; farmerName: string;
  region: string; weightKg: number; expectedWeightKg: number;
  pricePerShare: number; totalShares: number; soldShares: number;
  status: string; coverImage: string;
}
interface Farmer { id: string; name: string; region: string; }

const pigs = ref<Pig[]>([]);
const farmers = ref<Farmer[]>([]);
const loading = ref(true);
const showForm = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const editId = ref('');
const farmerIndex = ref(-1);

const form = reactive({
  title: '', breed: '', farmerId: '', region: '', weightKg: '',
  expectedWeightKg: '', pricePerShare: '', totalShares: '',
  coverImage: '', description: '',
});

const farmerNames = computed(() => farmers.value.map(f => `${f.name}（${f.region}）`));

onMounted(() => {
  if (!getFarmerId()) { uni.reLaunch({ url: '/pages/foster/login/index' }); return; }
  load();
});

async function load() {
  loading.value = true;
  try {
    const [pigsData, farmersData] = await Promise.all([
      request<Pig[]>('/foster/admin/pigs'),
      request<Farmer[]>('/foster/admin/farmers'),
    ]);
    pigs.value = pigsData;
    farmers.value = farmersData;
  } catch { uni.showToast({ title: '加载失败', icon: 'none' }); }
  finally { loading.value = false; }
}

function statusLabel(s: string) {
  const map: Record<string, string> = { listed: '上架中', draft: '草稿', sold_out: '已售罄', closed: '已关闭' };
  return map[s] || s;
}

function openAdd() {
  isEdit.value = false; editId.value = ''; farmerIndex.value = -1;
  Object.assign(form, { title: '', breed: '', farmerId: '', region: '',
    weightKg: '', expectedWeightKg: '', pricePerShare: '', totalShares: '',
    coverImage: '', description: '' });
  showForm.value = true;
}

function openEdit(p: Pig) {
  isEdit.value = true; editId.value = p.id;
  const idx = farmers.value.findIndex(f => f.id === p.farmerId);
  farmerIndex.value = idx;
  Object.assign(form, {
    title: p.title, breed: p.breed, farmerId: p.farmerId,
    region: p.region, weightKg: String(p.weightKg),
    expectedWeightKg: String(p.expectedWeightKg),
    pricePerShare: String(p.pricePerShare), totalShares: String(p.totalShares),
    coverImage: p.coverImage || '', description: '',
  });
  showForm.value = true;
}

function onPickFarmer(e: any) {
  farmerIndex.value = Number(e.detail.value);
  form.farmerId = farmers.value[farmerIndex.value]?.id || '';
  form.region = farmers.value[farmerIndex.value]?.region || form.region;
}

function cancelForm() { showForm.value = false; }

async function doSave() {
  if (!form.title.trim() || !form.farmerId) {
    uni.showToast({ title: '名称和农户必填', icon: 'none' }); return;
  }
  saving.value = true;
  try {
    const payload = {
      title: form.title, breed: form.breed || '土猪',
      farmerId: form.farmerId, region: form.region,
      weightKg: Number(form.weightKg) || 30,
      expectedWeightKg: Number(form.expectedWeightKg) || 120,
      pricePerShare: Number(form.pricePerShare) || 500,
      totalShares: Number(form.totalShares) || 10,
      coverImage: form.coverImage, description: form.description,
    };
    if (isEdit.value) {
      await request(`/foster/admin/pigs/${editId.value}`, { method: 'PATCH', data: payload });
    } else {
      await request('/foster/admin/pigs', { method: 'POST', data: payload });
    }
    uni.showToast({ title: isEdit.value ? '更新成功' : '添加成功', icon: 'success' });
    showForm.value = false;
    await load();
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally { saving.value = false; }
}

async function toggleStatus(p: Pig) {
  const newStatus = p.status === 'listed' ? 'closed' : 'listed';
  try {
    await request(`/foster/admin/pigs/${p.id}`, { method: 'PATCH', data: { status: newStatus } });
    await load();
    uni.showToast({ title: newStatus === 'listed' ? '已上架' : '已下架', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
}

async function doDelete(id: string, title: string) {
  const confirmed = await new Promise<boolean>(resolve => {
    uni.showModal({ title: '确认删除', content: `确定删除"${title}"吗？此操作不可撤销`,
      success: r => resolve(r.confirm) });
  });
  if (!confirmed) return;
  try {
    await request(`/foster/admin/pigs/${id}`, { method: 'DELETE' });
    uni.showToast({ title: '删除成功', icon: 'success' });
    await load();
  } catch (e: any) {
    uni.showToast({ title: e.message || '删除失败', icon: 'none' });
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 40rpx; }
.toolbar { padding: 24rpx 32rpx; }
.btn-add { background: #fa8c16; color: #fff; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; height: 80rpx; line-height: 80rpx; }
.center { padding: 80rpx 40rpx; text-align: center; }
.gray { color: #aaa; font-size: 28rpx; }
.empty { font-size: 28rpx; color: #aaa; }
.card { margin: 0 32rpx 20rpx; background: #fff; border-radius: 20rpx; padding: 28rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.card-top { display: flex; align-items: flex-start; margin-bottom: 20rpx; gap: 16rpx; }
.pig-avatar { font-size: 52rpx; flex-shrink: 0; }
.info { flex: 1; }
.pig-name { font-size: 30rpx; font-weight: 700; color: #222; display: block; }
.pig-meta { font-size: 24rpx; color: #666; display: block; margin-top: 4rpx; }
.status-badge { padding: 4rpx 16rpx; border-radius: 16rpx; font-size: 22rpx; height: fit-content; flex-shrink: 0; }
.status-badge.listed { background: #f6ffed; color: #52c41a; }
.status-badge.draft { background: #f5f5f5; color: #999; }
.status-badge.sold_out { background: #fff7e6; color: #fa8c16; }
.status-badge.closed { background: #f5f5f5; color: #aaa; }
.btn-row { display: flex; gap: 12rpx; }
.btn-edit, .btn-toggle, .btn-del { flex: 1; height: 60rpx; border-radius: 30rpx; display: flex; align-items: center; justify-content: center; }
.btn-edit { background: #e8f4ff; }
.btn-edit text { font-size: 24rpx; color: #1890ff; font-weight: 500; }
.btn-toggle { background: #fff7e6; }
.btn-toggle text { font-size: 24rpx; color: #fa8c16; font-weight: 500; }
.btn-del { background: #fff1f0; }
.btn-del text { font-size: 24rpx; color: #ff4d4f; font-weight: 500; }
.form { margin: 24rpx 32rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.form-title { font-size: 34rpx; font-weight: 700; color: #222; display: block; margin-bottom: 32rpx; }
.field { margin-bottom: 24rpx; }
.label { font-size: 26rpx; color: #555; display: block; margin-bottom: 10rpx; font-weight: 500; }
.input { border: 2rpx solid #eee; border-radius: 12rpx; height: 80rpx; padding: 0 24rpx; font-size: 28rpx; color: #333; background: #fafafa; }
.textarea { border: 2rpx solid #eee; border-radius: 12rpx; min-height: 120rpx; padding: 20rpx 24rpx; font-size: 28rpx; color: #333; background: #fafafa; width: 100%; box-sizing: border-box; }
.picker-view { border: 2rpx solid #eee; border-radius: 12rpx; height: 80rpx; padding: 0 24rpx; background: #fafafa; display: flex; align-items: center; justify-content: space-between; }
.picker-view text { font-size: 28rpx; color: #333; }
.picker-arrow { color: #ccc; font-size: 32rpx; }
.form-btns { display: flex; gap: 20rpx; margin-top: 32rpx; }
.btn-cancel { flex: 1; height: 88rpx; border-radius: 44rpx; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; }
.btn-cancel text { font-size: 28rpx; color: #888; }
.btn-save { flex: 2; height: 88rpx; border-radius: 44rpx; background: #fa8c16; display: flex; align-items: center; justify-content: center; }
.btn-save text { font-size: 30rpx; color: #fff; font-weight: 700; }
</style>
