<template>
  <view class="login-page">
    <view class="logo-area">
      <text class="pig-emoji">🐷</text>
      <text class="app-name">私人订猪</text>
      <text class="app-sub">代养人工作台</text>
    </view>

    <view class="card">
      <text class="card-title">选择您的农户身份</text>
      <view v-if="loading" class="center"><text>加载中…</text></view>
      <view v-else-if="!farmers.length" class="center">
        <text class="empty">暂无农户数据，请先在管理端添加农户</text>
      </view>
      <view v-else>
        <view
          v-for="f in farmers"
          :key="f.id"
          class="farmer-item"
          :class="{ selected: selectedId === f.id }"
          @tap="select(f.id)"
        >
          <!-- 头像：有 URL 则显示图片，否则显示姓名首字 -->
          <image
            v-if="f.avatarUrl && !imgErrors[f.id]"
            class="avatar"
            :src="f.avatarUrl"
            mode="aspectFill"
            @error="imgErrors[f.id] = true"
          />
          <view v-else class="avatar-text">{{ f.name.slice(0, 1) }}</view>

          <view class="info">
            <text class="name">{{ f.name }}</text>
            <text class="meta">{{ f.region }} · 散养 {{ f.years }} 年</text>
          </view>
          <text v-if="selectedId === f.id" class="check">✓</text>
        </view>
      </view>

      <button class="btn-login" :disabled="!selectedId" @tap="confirm">进入工作台</button>

      <!-- 管理员入口 -->
      <view class="admin-link" @tap="goAdmin">
        <text class="admin-text">⚙️ 管理员：录入农户/猪只数据</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { request, setFarmerId } from '../../utils/request';

interface Farmer { id: string; name: string; region: string; years: number; avatarUrl: string; }

const farmers = ref<Farmer[]>([]);
const selectedId = ref('');
const loading = ref(true);
const imgErrors = reactive<Record<string, boolean>>({});

onMounted(async () => {
  try {
    farmers.value = await request<Farmer[]>('/foster/farmers');
  } catch (e) {
    uni.showToast({ title: '获取农户列表失败，请检查网络', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

function select(id: string) { selectedId.value = id; }

function confirm() {
  if (!selectedId.value) return;
  setFarmerId(selectedId.value);
  uni.reLaunch({ url: '/pages/workbench/index' });
}

function goAdmin() {
  uni.navigateTo({ url: '/pages/admin/index' });
}
</script>

<style scoped>
.login-page { min-height: 100vh; background: linear-gradient(160deg, #1a6b35 0%, #2d8a4e 50%, #3da862 100%); display: flex; flex-direction: column; align-items: center; padding: 80rpx 40rpx 40rpx; }
.logo-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 60rpx; }
.pig-emoji { font-size: 100rpx; }
.app-name { font-size: 52rpx; font-weight: 700; color: #fff; margin-top: 16rpx; }
.app-sub { font-size: 28rpx; color: rgba(255,255,255,0.85); margin-top: 8rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 40rpx; width: 100%; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.12); }
.card-title { font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 32rpx; display: block; }
.center { text-align: center; padding: 40rpx; color: #999; }
.empty { font-size: 26rpx; color: #aaa; line-height: 1.6; }
.farmer-item { display: flex; align-items: center; padding: 24rpx; border-radius: 16rpx; margin-bottom: 16rpx; border: 2rpx solid #eee; }
.farmer-item.selected { border-color: #2d8a4e; background: #f0faf4; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 44rpx; margin-right: 24rpx; background: #ddd; flex-shrink: 0; }
.avatar-text { width: 88rpx; height: 88rpx; border-radius: 44rpx; margin-right: 24rpx; background: #2d8a4e; color: #fff; font-size: 36rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.info { flex: 1; }
.name { font-size: 32rpx; font-weight: 600; color: #222; display: block; }
.meta { font-size: 24rpx; color: #888; margin-top: 6rpx; display: block; }
.check { font-size: 36rpx; color: #2d8a4e; font-weight: 700; }
.btn-login { margin-top: 32rpx; background: #2d8a4e; color: #fff; border-radius: 50rpx; font-size: 32rpx; font-weight: 600; height: 96rpx; line-height: 96rpx; }
.btn-login[disabled] { background: #ccc; }
.admin-link { margin-top: 24rpx; text-align: center; padding: 16rpx; }
.admin-text { font-size: 24rpx; color: #2d8a4e; text-decoration: underline; }
</style>
