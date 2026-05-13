<template>
  <view class="login-page">
    <view class="logo-area">
      <text class="pig-emoji">🐷</text>
      <text class="app-name">私人订猪</text>
      <text class="app-sub">代养人工作台</text>
    </view>

    <view class="card">
      <!-- 当前已登录提示 -->
      <view v-if="currentFarmerName" class="current-farmer-bar">
        <view class="current-info">
          <text class="current-label">当前身份</text>
          <text class="current-name">{{ currentFarmerName }}</text>
        </view>
        <view class="btn-switch" @tap="goWorkbench">
          <text class="btn-switch-text">继续使用 →</text>
        </view>
      </view>

      <text class="card-title">{{ currentFarmerName ? '切换为其他农户' : '选择您的农户身份' }}</text>

      <view v-if="loading" class="center"><text class="gray-text">加载中…</text></view>
      <view v-else-if="!farmers.length" class="center">
        <text class="empty">暂无农户数据，请先在管理端添加农户</text>
      </view>
      <view v-else>
        <view
          v-for="f in farmers"
          :key="f.id"
          class="farmer-item"
          :class="{ selected: selectedId === f.id, current: f.id === currentFarmerId }"
          @tap="select(f.id)"
        >
          <!-- 头像 -->
          <image
            v-if="f.avatarUrl && !imgErrors[f.id]"
            class="avatar"
            :src="f.avatarUrl"
            mode="aspectFill"
            @error="imgErrors[f.id] = true"
          />
          <view v-else class="avatar-text" :class="{ 'avatar-current': f.id === currentFarmerId }">
            {{ f.name.slice(0, 1) }}
          </view>

          <view class="info">
            <view class="name-row">
              <text class="name">{{ f.name }}</text>
              <text v-if="f.id === currentFarmerId" class="tag-current">当前</text>
            </view>
            <text class="meta">{{ f.region }} · 散养 {{ f.years }} 年</text>
          </view>
          <text v-if="selectedId === f.id" class="check">✓</text>
        </view>
      </view>

      <button
        class="btn-login"
        :disabled="!selectedId"
        @tap="confirm"
      >
        {{ selectedId && selectedId === currentFarmerId ? '继续进入工作台' : '切换并进入工作台' }}
      </button>

      <!-- 管理员入口 -->
      <view class="admin-link" @tap="goAdmin">
        <text class="admin-text">⚙️ 管理员：录入农户/猪只数据</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { request, setFarmerId, getFarmerId } from '../../utils/request';

interface Farmer {
  id: string;
  name: string;
  region: string;
  years: number;
  avatarUrl: string;
}

const farmers = ref<Farmer[]>([]);
const selectedId = ref('');
const loading = ref(true);
const imgErrors = reactive<Record<string, boolean>>({});

// 当前已登录的 farmerId
const currentFarmerId = ref('');

// 计算当前农户名
const currentFarmerName = computed(() => {
  if (!currentFarmerId.value) return '';
  const f = farmers.value.find(f => f.id === currentFarmerId.value);
  return f?.name || '';
});

onMounted(async () => {
  // 读取已存储的 farmerId
  currentFarmerId.value = getFarmerId();
  // 如果已登录，默认选中当前农户
  if (currentFarmerId.value) {
    selectedId.value = currentFarmerId.value;
  }
  try {
    farmers.value = await request<Farmer[]>('/foster/farmers');
    // 加载完农户列表后，再确认一次 selectedId
    if (currentFarmerId.value && farmers.value.find(f => f.id === currentFarmerId.value)) {
      selectedId.value = currentFarmerId.value;
    }
  } catch {
    uni.showToast({ title: '获取农户列表失败，请检查网络', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

function select(id: string) {
  selectedId.value = id;
}

function confirm() {
  if (!selectedId.value) return;
  setFarmerId(selectedId.value);
  uni.reLaunch({ url: '/pages/workbench/index' });
}

function goWorkbench() {
  uni.reLaunch({ url: '/pages/workbench/index' });
}

function goAdmin() {
  uni.navigateTo({ url: '/pages/admin/index' });
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1a6b35 0%, #2d8a4e 50%, #3da862 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx 40rpx;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
}
.pig-emoji { font-size: 100rpx; }
.app-name { font-size: 52rpx; font-weight: 700; color: #fff; margin-top: 16rpx; }
.app-sub { font-size: 28rpx; color: rgba(255,255,255,0.85); margin-top: 8rpx; }

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 100%;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.12);
}

/* 当前已登录农户提示栏 */
.current-farmer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0faf4;
  border: 2rpx solid #2d8a4e;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 28rpx;
}
.current-info { display: flex; flex-direction: column; }
.current-label { font-size: 22rpx; color: #888; }
.current-name { font-size: 30rpx; font-weight: 700; color: #1a6b35; margin-top: 4rpx; }
.btn-switch {
  background: #2d8a4e;
  border-radius: 30rpx;
  padding: 10rpx 24rpx;
}
.btn-switch-text { font-size: 24rpx; color: #fff; font-weight: 600; }

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #555;
  margin-bottom: 24rpx;
  display: block;
}

.center { text-align: center; padding: 40rpx; color: #999; }
.gray-text { font-size: 28rpx; color: #aaa; }
.empty { font-size: 26rpx; color: #aaa; line-height: 1.6; }

.farmer-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid #eee;
  background: #fafafa;
}
.farmer-item.selected {
  border-color: #2d8a4e;
  background: #f0faf4;
}
.farmer-item.current {
  border-color: #a8d8bc;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  margin-right: 24rpx;
  background: #ddd;
  flex-shrink: 0;
}
.avatar-text {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  margin-right: 24rpx;
  background: #88c4a0;
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-text.avatar-current {
  background: #2d8a4e;
}

.info { flex: 1; }
.name-row { display: flex; align-items: center; gap: 12rpx; }
.name { font-size: 32rpx; font-weight: 600; color: #222; }
.tag-current {
  font-size: 20rpx;
  color: #2d8a4e;
  border: 1rpx solid #2d8a4e;
  border-radius: 8rpx;
  padding: 0 8rpx;
  line-height: 1.6;
}
.meta { font-size: 24rpx; color: #888; margin-top: 6rpx; display: block; }
.check { font-size: 36rpx; color: #2d8a4e; font-weight: 700; }

.btn-login {
  margin-top: 32rpx;
  background: #2d8a4e;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  height: 96rpx;
  line-height: 96rpx;
}
.btn-login[disabled] { background: #ccc; }

.admin-link { margin-top: 24rpx; text-align: center; padding: 16rpx; }
.admin-text { font-size: 24rpx; color: #2d8a4e; text-decoration: underline; }
</style>
