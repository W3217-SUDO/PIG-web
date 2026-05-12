<template>
  <view class="page">
    <view v-if="loading" class="state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="empty">
      <text class="empty-icon">📭</text>
      <text class="empty-text">还没有消息</text>
    </view>

    <template v-else>
      <view class="header">
        <text class="header-stat">{{ unreadCount }} 条未读 / 共 {{ total }} 条</text>
        <view v-if="unreadCount" class="read-all" @tap="onReadAll">
          <text>全部已读</text>
        </view>
      </view>

      <view class="list">
        <view
          v-for="m in list"
          :key="m.id"
          :class="['msg-card', !m.isRead && 'msg-unread']"
          @tap="onOpen(m)"
        >
          <view :class="['msg-icon', 'msg-icon-' + m.type]">
            <text>{{ iconFor(m.type) }}</text>
          </view>
          <view class="msg-meta">
            <view class="msg-row1">
              <text class="msg-title">{{ m.title }}</text>
              <view v-if="!m.isRead" class="unread-dot"></view>
            </view>
            <text class="msg-content">{{ m.content }}</text>
            <text class="msg-time">{{ relTime(m.createdAt) }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, ApiError } from '../../utils/request';

interface Message {
  id: string;
  createdAt: string;
  type: 'order_paid' | 'order_cancelled' | 'pig_update' | 'share' | 'system';
  title: string;
  content: string;
  relatedId: string;
  isRead: boolean;
}

const list = ref<Message[]>([]);
const total = ref(0);
const unreadCount = ref(0);
const loading = ref(true);

function iconFor(t: string) {
  return t === 'order_paid' ? '🎉'
    : t === 'order_cancelled' ? '❌'
    : t === 'pig_update' ? '🐷'
    : t === 'share' ? '🤝'
    : 'ℹ️';
}

function relTime(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

async function load() {
  loading.value = true;
  try {
    const data = await request<{ items: Message[]; total: number; unreadCount: number }>(
      '/messages?pageSize=50',
    );
    list.value = data.items;
    total.value = data.total;
    unreadCount.value = data.unreadCount;
  } catch (e) {
    if (!(e instanceof ApiError && e.bizCode === 10001)) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function onReadAll() {
  try {
    await request('/messages/read-all', { method: 'POST' });
    uni.showToast({ title: '已全部已读', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({ title: e instanceof ApiError ? e.message : '操作失败', icon: 'none' });
  }
}

async function onOpen(m: Message) {
  // 1. 标记已读
  if (!m.isRead) {
    try {
      await request(`/messages/${m.id}/read`, { method: 'PATCH' });
      m.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch {
      // 静默
    }
  }
  // 2. 按类型跳转
  if (m.type === 'order_paid' || m.type === 'order_cancelled') {
    uni.navigateTo({ url: `/pages/my/orders` });
  } else if (m.type === 'pig_update' && m.relatedId) {
    uni.navigateTo({ url: `/pages/pig/detail?id=${m.relatedId}` });
  }
}

onShow(load);
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
}

.state, .empty {
  padding: 200rpx 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state text, .empty-text { color: #999; font-size: 26rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }

.header {
  background: #fff;
  padding: 24rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2rpx solid #f0e8d4;
}
.header-stat {
  font-size: 24rpx;
  color: #888;
}
.read-all {
  padding: 8rpx 20rpx;
  background: #fff5e6;
  border-radius: 24rpx;
}
.read-all text { font-size: 22rpx; color: #c0392b; font-weight: 700; }

.list {
  padding: 16rpx 24rpx 32rpx;
  display: flex;
  flex-direction: column;
}
.msg-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-top: 16rpx;
  display: flex;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.msg-unread {
  background: #fffdf5;
}
.msg-icon {
  width: 80rpx; height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF5F0, #FFE4D6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.msg-icon text { font-size: 40rpx; }
.msg-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.msg-row1 {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.msg-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.unread-dot {
  width: 16rpx; height: 16rpx;
  border-radius: 50%;
  background: #c0392b;
  margin-left: 8rpx;
}
.msg-content {
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
  margin-bottom: 8rpx;
}
.msg-time {
  font-size: 20rpx;
  color: #aaa;
}
</style>
