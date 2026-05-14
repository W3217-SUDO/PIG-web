<template>
  <view class="page">
    <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
    <scroll-view v-else scroll-y class="scroll">
      <view v-if="!tasks.length" class="center">
        <text class="empty-emoji">🎉</text>
        <text class="empty-text">今日任务已全部完成！</text>
      </view>

      <view v-for="task in tasks" :key="task.id" class="task-card">
        <view class="task-header">
          <view class="meal-left">
            <text class="meal-icon">{{ task.icon }}</text>
            <text class="meal-name">{{ task.label }}</text>
          </view>
          <view class="status-tag" :class="task.status">
            <text>{{ statusLabel(task.status) }}</text>
          </view>
        </view>

        <view class="task-meta">
          <text class="meta-text">{{ task.area }}</text>
          <text class="dot"> | </text>
          <text class="meta-time">{{ task.timeSlot }}</text>
          <text class="dot"> | </text>
          <text class="meta-food">{{ task.foodDesc }}</text>
        </view>

        <view class="btn-area">
          <button
            class="checkin-btn"
            :class="task.status"
            :disabled="task.status === 'done' || task.status === 'pending'"
            @tap="checkin(task)"
          >
            <text>{{ btnLabel(task.status) }}</text>
          </button>
        </view>
      </view>

      <view class="date-footer">
        <text class="date-text">📅 {{ todayStr }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, getFarmerId } from '../../utils/request';

interface Task { id: string; label: string; icon: string; area: string; timeSlot: string; foodDesc: string; status: string; checkedAt: string | null; }

const tasks = ref<Task[]>([]);
const loading = ref(true);

const now = new Date();
const todayStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

onShow(load);

async function load() {
  const farmerId = getFarmerId();
  if (!farmerId) { uni.reLaunch({ url: '/pages/login/index' }); return; }
  loading.value = true;
  try {
    tasks.value = await request<Task[]>(`/foster/tasks/today?farmerId=${farmerId}`);
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function statusLabel(s: string) {
  if (s === 'done') return '已完成';
  if (s === 'in_progress') return '进行中';
  return '待完成';
}

function btnLabel(s: string) {
  if (s === 'done') return '✓ 已打卡';
  if (s === 'in_progress') return '立即打卡';
  return '待完成';
}

async function checkin(task: Task) {
  if (task.status !== 'in_progress') return;
  try {
    uni.showLoading({ title: '打卡中…' });
    const updated = await request<Task>(`/foster/tasks/${task.id}/checkin`, { method: 'POST' });
    const idx = tasks.value.findIndex(t => t.id === task.id);
    if (idx !== -1) tasks.value[idx] = updated;
    uni.hideLoading();
    uni.showToast({ title: '打卡成功 🎉', icon: 'success' });
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e.message || '打卡失败', icon: 'none' });
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.scroll { height: 100vh; padding: 24rpx 24rpx 140rpx; box-sizing: border-box; }
.center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 40rpx; }
.gray { color: #aaa; font-size: 30rpx; }
.empty-emoji { font-size: 100rpx; }
.empty-text { font-size: 32rpx; color: #888; margin-top: 24rpx; }
.task-card { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.task-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.meal-left { display: flex; align-items: center; gap: 12rpx; }
.meal-icon { font-size: 44rpx; }
.meal-name { font-size: 34rpx; font-weight: 600; color: #222; }
.status-tag { padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: 500; }
.status-tag.done { background: #f6ffed; color: #52c41a; }
.status-tag.in_progress { background: #fff7e6; color: #fa8c16; }
.status-tag.pending { background: #f5f5f5; color: #999; }
.task-meta { display: flex; flex-wrap: wrap; align-items: center; margin-bottom: 24rpx; }
.meta-text, .meta-time, .meta-food { font-size: 26rpx; color: #666; }
.meta-time { color: #fa8c16; }
.dot { color: #ccc; margin: 0 6rpx; font-size: 24rpx; }
.btn-area { display: flex; justify-content: flex-start; }
.checkin-btn { border-radius: 40rpx; font-size: 28rpx; font-weight: 600; padding: 0 40rpx; height: 72rpx; line-height: 72rpx; border: none; margin: 0; }
.checkin-btn.done { background: #ccc; color: #fff; }
.checkin-btn.in_progress { background: #2d8a4e; color: #fff; }
.checkin-btn.pending { background: #e0e0e0; color: #aaa; }
.date-footer { text-align: center; padding: 24rpx; }
.date-text { font-size: 26rpx; color: #bbb; }
</style>
