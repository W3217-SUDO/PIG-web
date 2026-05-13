<template>
  <view class="page">
    <view class="tip-card">
      <text class="tip-title">📋 为农户生成今日任务</text>
      <text class="tip-desc">选择农户，配置三餐时间段，一键生成今日喂养任务（会覆盖今日已有任务）</text>
    </view>

    <!-- 选择农户 -->
    <view class="section">
      <text class="section-title">选择农户</text>
      <view v-if="loadingFarmers" class="center"><text class="gray">加载中…</text></view>
      <view v-else class="farmer-list">
        <view
          v-for="f in farmers"
          :key="f.id"
          class="farmer-chip"
          :class="{ active: selectedFarmerId === f.id }"
          @tap="selectedFarmerId = f.id"
        >
          <text>{{ f.name }}</text>
        </view>
      </view>
    </view>

    <!-- 任务配置 -->
    <view class="section">
      <text class="section-title">任务配置</text>
      <view v-for="(task, i) in tasks" :key="i" class="task-config">
        <view class="task-config-header">
          <text class="task-icon">{{ mealIcons[task.mealType] }}</text>
          <text class="task-label">{{ mealLabels[task.mealType] }}</text>
        </view>
        <view class="field">
          <text class="label">时间段</text>
          <input class="input" v-model="task.timeSlot" placeholder="例：07:00-08:00" />
        </view>
        <view class="field">
          <text class="label">饲料描述</text>
          <input class="input" v-model="task.foodDesc" placeholder="例：玉米面粥+青菜" />
        </view>
        <view class="field">
          <text class="label">栏位</text>
          <input class="input" v-model="task.area" placeholder="例：A区-01栏" />
        </view>
      </view>
    </view>

    <view class="submit-area">
      <button
        class="btn-submit"
        :disabled="!selectedFarmerId || submitting"
        @tap="doGenerate"
      >
        <text>{{ submitting ? '生成中…' : '🚀 生成今日任务' }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { request } from '../../utils/request';

interface Farmer { id: string; name: string; region: string; }

const farmers = ref<Farmer[]>([]);
const loadingFarmers = ref(true);
const selectedFarmerId = ref('');
const submitting = ref(false);

const mealLabels: Record<string, string> = { breakfast: '早餐喂养', lunch: '午餐喂养', dinner: '晚餐喂养' };
const mealIcons: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

const tasks = reactive([
  { mealType: 'breakfast', timeSlot: '07:00-08:00', foodDesc: '玉米面粥+青菜', area: 'A区-01栏' },
  { mealType: 'lunch',     timeSlot: '12:00-13:00', foodDesc: '红薯+豆类',    area: 'A区-01栏' },
  { mealType: 'dinner',    timeSlot: '18:00-19:00', foodDesc: '粗粮+蔬菜',    area: 'A区-01栏' },
]);

onMounted(async () => {
  try {
    farmers.value = await request<Farmer[]>('/foster/admin/farmers');
  } catch { uni.showToast({ title: '加载农户失败', icon: 'none' }); }
  finally { loadingFarmers.value = false; }
});

async function doGenerate() {
  if (!selectedFarmerId.value) return;
  const farmerName = farmers.value.find(f => f.id === selectedFarmerId.value)?.name;
  const confirmed = await new Promise<boolean>(resolve =>
    uni.showModal({ title: '确认生成', content: `为"${farmerName}"生成今日 3 条任务？`,
      success: r => resolve(r.confirm) })
  );
  if (!confirmed) return;
  submitting.value = true;
  try {
    const result = await request<any[]>('/foster/admin/tasks', {
      method: 'POST',
      data: { farmerId: selectedFarmerId.value, tasks },
    });
    uni.showToast({ title: `已生成 ${result.length} 条任务`, icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e.message || '生成失败', icon: 'none' });
  } finally { submitting.value = false; }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 60rpx; }
.tip-card { margin: 24rpx 32rpx; background: #e8f4ff; border-radius: 16rpx; padding: 28rpx; }
.tip-title { font-size: 30rpx; font-weight: 700; color: #1890ff; display: block; margin-bottom: 8rpx; }
.tip-desc { font-size: 24rpx; color: #555; line-height: 1.6; display: block; }
.section { margin: 0 32rpx 24rpx; background: #fff; border-radius: 20rpx; padding: 28rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #333; display: block; margin-bottom: 20rpx; }
.center { padding: 40rpx; text-align: center; }
.gray { color: #aaa; font-size: 26rpx; }
.farmer-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.farmer-chip { padding: 12rpx 28rpx; border-radius: 32rpx; border: 2rpx solid #eee; background: #f9f9f9; }
.farmer-chip.active { border-color: #2d8a4e; background: #f0faf4; }
.farmer-chip text { font-size: 28rpx; color: #333; font-weight: 500; }
.farmer-chip.active text { color: #2d8a4e; }
.task-config { border: 1rpx solid #f0f0f0; border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; background: #fafafa; }
.task-config-header { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.task-icon { font-size: 36rpx; }
.task-label { font-size: 28rpx; font-weight: 700; color: #333; }
.field { margin-bottom: 16rpx; }
.label { font-size: 24rpx; color: #666; display: block; margin-bottom: 8rpx; }
.input { border: 2rpx solid #eee; border-radius: 10rpx; height: 72rpx; padding: 0 20rpx; font-size: 26rpx; color: #333; background: #fff; }
.submit-area { padding: 32rpx; }
.btn-submit { background: #2d8a4e; color: #fff; border-radius: 50rpx; font-size: 32rpx; font-weight: 700; height: 96rpx; line-height: 96rpx; }
.btn-submit[disabled] { background: #ccc; }
</style>
