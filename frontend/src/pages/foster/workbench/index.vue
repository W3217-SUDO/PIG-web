<template>
  <view class="page">
    <!-- 自定义导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left">
          <text class="back-btn" @tap="exitFoster">← 客户端</text>
        </view>
        <text class="nav-title">代养人工作台</text>
        <text class="bell-icon" @tap="goMessages">🔔</text>
      </view>
    </view>

    <scroll-view scroll-y class="body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <!-- 统计卡片 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-num green">{{ dashboard.pigCount }}</text>
          <text class="stat-label">托管猪只</text>
        </view>
        <view class="divider" />
        <view class="stat-item">
          <text class="stat-num orange">{{ dashboard.pendingTaskCount }}</text>
          <text class="stat-label">待完成任务</text>
        </view>
      </view>

      <!-- 今日任务 -->
      <view class="section-title">今日任务</view>
      <view class="task-card">
        <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
        <view v-else-if="!dashboard.todayTasks?.length" class="center">
          <text class="gray">今日暂无任务 🎉</text>
        </view>
        <view
          v-for="task in dashboard.todayTasks"
          :key="task.id"
          class="task-row"
          @tap="goTasks"
        >
          <text class="task-icon">{{ task.icon }}</text>
          <view class="task-info">
            <text class="task-name">{{ task.label }} · {{ task.area }}</text>
            <text class="task-time">{{ task.timeSlot }}</text>
          </view>
          <view class="status-badge" :class="task.status">
            <text>{{ statusLabel(task.status) }}</text>
          </view>
        </view>
      </view>

      <!-- 快捷导航 -->
      <view class="section-title">快捷入口</view>
      <view class="quick-nav">
        <view class="quick-item" @tap="goTasks">
          <text class="quick-icon">📋</text>
          <text class="quick-label">喂养任务</text>
        </view>
        <view class="quick-item" @tap="goPigs">
          <text class="quick-icon">🐷</text>
          <text class="quick-label">我的猪只</text>
        </view>
        <view class="quick-item" @tap="goEarnings">
          <text class="quick-icon">💰</text>
          <text class="quick-label">收益中心</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-wrap">
        <text class="logout-btn" @tap="logout">切换农户</text>
      </view>
    </scroll-view>

    <!-- 底部导航栏 -->
    <FosterTabBar current="workbench" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, getFarmerId, clearAuth } from '../../../utils/fosterRequest';
import FosterTabBar from '../../../components/FosterTabBar.vue';

interface Task { id: string; label: string; icon: string; area: string; timeSlot: string; status: string; }
interface Dashboard { pigCount: number; pendingTaskCount: number; todayTasks: Task[]; }

const dashboard = ref<Dashboard>({ pigCount: 0, pendingTaskCount: 0, todayTasks: [] });
const loading = ref(true);
const statusBarHeight = ref(20);

onMounted(() => {
  const info = uni.getSystemInfoSync();
  statusBarHeight.value = info.statusBarHeight || 20;
});

onShow(load);

async function load() {
  const farmerId = getFarmerId();
  if (!farmerId) { uni.reLaunch({ url: '/pages/foster/login/index' }); return; }
  loading.value = true;
  try {
    dashboard.value = await request<Dashboard>(`/foster/dashboard?farmerId=${farmerId}`);
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function statusLabel(s: string) {
  return s === 'done' ? '✅ 已完成' : s === 'in_progress' ? '⏳ 进行中' : '🕐 未开始';
}

function goTasks() { uni.redirectTo({ url: '/pages/foster/tasks/index' }); }
function goPigs() { uni.redirectTo({ url: '/pages/foster/pigs/index' }); }
function goEarnings() { uni.redirectTo({ url: '/pages/foster/earnings/index' }); }
function goMessages() { uni.showToast({ title: '暂无新消息', icon: 'none' }); }
function exitFoster() { uni.reLaunch({ url: '/pages/index/index' }); }
function logout() {
  uni.showModal({
    title: '切换农户',
    content: '确定要切换农户身份吗？',
    success: (res) => {
      if (res.confirm) {
        clearAuth();
        uni.reLaunch({ url: '/pages/foster/login/index' });
      }
    },
  });
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: linear-gradient(135deg, #1a6b35, #2d8a4e); }
.nav-content { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.back-btn { font-size: 26rpx; color: rgba(255,255,255,0.9); font-weight: 500; padding: 8rpx 0; }
.nav-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.bell-icon { font-size: 44rpx; }
.body { height: 100vh; padding-bottom: 120rpx; box-sizing: border-box; }
.stats-card { margin: 24rpx; background: #fff; border-radius: 20rpx; display: flex; align-items: center; padding: 40rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.stat-item { flex: 1; text-align: center; }
.stat-num { font-size: 72rpx; font-weight: 800; display: block; }
.stat-num.green { color: #2d8a4e; }
.stat-num.orange { color: #fa8c16; }
.stat-label { font-size: 26rpx; color: #888; margin-top: 8rpx; display: block; }
.divider { width: 2rpx; height: 80rpx; background: #eee; }
.section-title { padding: 24rpx 32rpx 12rpx; font-size: 30rpx; font-weight: 600; color: #333; }
.task-card { margin: 0 24rpx 24rpx; background: #fff; border-radius: 20rpx; padding: 8rpx 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.center { padding: 40rpx; text-align: center; }
.gray { color: #aaa; font-size: 28rpx; }
.task-row { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.task-row:last-child { border-bottom: none; }
.task-icon { font-size: 48rpx; margin-right: 20rpx; }
.task-info { flex: 1; }
.task-name { font-size: 30rpx; font-weight: 500; color: #222; display: block; }
.task-time { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; }
.status-badge { padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; }
.status-badge.done { background: #f6ffed; color: #52c41a; }
.status-badge.in_progress { background: #fff7e6; color: #fa8c16; }
.status-badge.pending { background: #f5f5f5; color: #999; }
/* 快捷入口 */
.quick-nav { display: flex; margin: 0 24rpx 24rpx; gap: 16rpx; }
.quick-item { flex: 1; background: #fff; border-radius: 20rpx; padding: 32rpx 0; display: flex; flex-direction: column; align-items: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.quick-icon { font-size: 52rpx; }
.quick-label { font-size: 24rpx; color: #555; margin-top: 12rpx; font-weight: 500; }
/* 退出 */
.logout-wrap { text-align: center; padding: 40rpx; }
.logout-btn { font-size: 28rpx; color: #999; border-bottom: 1rpx solid #ddd; padding-bottom: 4rpx; }
</style>
