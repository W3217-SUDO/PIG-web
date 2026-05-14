<template>
  <view class="page">
    <view v-if="loading" class="center"><text class="gray">加载中…</text></view>
    <scroll-view v-else scroll-y class="scroll">
      <view v-if="!pigs.length" class="center">
        <text class="empty-emoji">🐷</text>
        <text class="empty-text">暂无托管猪只</text>
      </view>

      <view v-for="pig in pigs" :key="pig.id" class="pig-card">
        <view class="card-top">
          <view class="pig-left">
            <text class="pig-icon">🐷</text>
            <view class="pig-name-wrap">
              <text class="pig-name">{{ pig.nickname }}</text>
              <text class="stall-no">{{ pig.stallNo }}</text>
            </view>
          </view>
          <view class="health-tag" :class="pig.healthStatus">
            <text>{{ healthLabel(pig.healthStatus) }}</text>
          </view>
        </view>

        <view class="divider" />

        <view class="pig-stats">
          <view class="stat-item">
            <text class="stat-val">{{ pig.weightKg ?? '—' }}</text>
            <text class="stat-unit">kg</text>
            <text class="stat-label">当前体重</text>
          </view>
          <view class="stat-sep" />
          <view class="stat-item">
            <text class="stat-val">{{ pig.daysRaised }}</text>
            <text class="stat-unit">天</text>
            <text class="stat-label">已饲养</text>
          </view>
          <view class="stat-sep" />
          <view class="stat-item">
            <text class="stat-val owner-val">{{ pig.ownerNote || pig.ownerName || '待认领' }}</text>
            <text class="stat-label">主人</text>
          </view>
        </view>

        <!-- 修改按钮 -->
        <view class="edit-bar">
          <view class="btn-edit-pig" @tap="openEdit(pig)">
            <text>✏️ 修改信息</text>
          </view>
        </view>
      </view>

      <view class="footer-tip">
        <text class="tip-text">共托管 {{ pigs.length }} 头猪只 · 饲养天数随实时时间自动累计</text>
      </view>
    </scroll-view>

    <!-- ── 修改信息弹层 ── -->
    <view v-if="showEditModal" class="modal-mask" @tap.stop>
      <view class="modal-box">
        <text class="modal-title">修改猪只信息</text>
        <text class="modal-subtitle">{{ editPig?.nickname }} {{ editPig?.stallNo }}</text>

        <!-- 体重 -->
        <view class="modal-section">
          <text class="modal-label">📏 更新体重（kg）</text>
          <input
            class="modal-input"
            v-model="editForm.weightKg"
            type="digit"
            placeholder="输入新体重，例：42.5"
          />
          <!-- 称重图片（必填） -->
          <text class="modal-label mt">📷 称重凭证图片（必须上传）</text>
          <view v-if="editForm.weightImage" class="weight-img-wrap">
            <image class="weight-img" :src="editForm.weightImage" mode="aspectFill" />
            <view class="del-img" @tap="editForm.weightImage = ''">
              <text class="del-text">✕</text>
            </view>
          </view>
          <view v-else class="upload-btn" @tap="chooseWeightImage">
            <text class="upload-icon">📸</text>
            <text class="upload-text">点击上传称重图片</text>
          </view>
          <text class="tip-note">⚠️ 修改体重必须上传磅秤称重照片作为凭证</text>
        </view>

        <!-- 主人备注 -->
        <view class="modal-section">
          <text class="modal-label">👤 主人备注</text>
          <input
            class="modal-input"
            v-model="editForm.ownerNote"
            placeholder="例：张大爷（选填，不影响订单记录）"
          />
          <text class="tip-note">💡 饲养天数由打卡时间自动累计，无法手动修改</text>
        </view>

        <!-- 按钮 -->
        <view class="modal-btns">
          <view class="modal-btn-cancel" @tap="closeEdit">
            <text>取消</text>
          </view>
          <view class="modal-btn-save" :class="{ saving: editSaving }" @tap="doSave">
            <text>{{ editSaving ? '保存中…' : '✓ 保存' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, getFarmerId } from '../../utils/request';

interface Pig {
  id: string;
  nickname: string;
  stallNo: string;
  healthStatus: string;
  weightKg: number | null;
  daysRaised: number;
  ownerName: string;
  ownerNote: string;
}

const pigs = ref<Pig[]>([]);
const loading = ref(true);
const showEditModal = ref(false);
const editPig = ref<Pig | null>(null);
const editSaving = ref(false);

const editForm = reactive({
  weightKg: '',
  weightImage: '',
  ownerNote: '',
});

onShow(load);

async function load() {
  const farmerId = getFarmerId();
  if (!farmerId) { uni.reLaunch({ url: '/pages/login/index' }); return; }
  loading.value = true;
  try {
    const data = await request<Pig[]>(`/foster/pigs?farmerId=${farmerId}`);
    pigs.value = data;
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function healthLabel(s: string) {
  if (s === 'healthy') return '健康';
  if (s === 'sick') return '生病';
  if (s === 'recovering') return '恢复中';
  return '待检查';
}

function openEdit(pig: Pig) {
  editPig.value = pig;
  editForm.weightKg = pig.weightKg !== null ? String(pig.weightKg) : '';
  editForm.weightImage = '';
  editForm.ownerNote = pig.ownerNote || pig.ownerName || '';
  showEditModal.value = true;
}

function closeEdit() {
  showEditModal.value = false;
  editPig.value = null;
}

/** 选择称重图片（先上传到服务器，这里用 base64 本地预览模拟） */
function chooseWeightImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: (res) => {
      // 使用本地临时路径（真实项目中应上传到服务器获取 URL）
      editForm.weightImage = res.tempFilePaths[0];
      uni.showToast({ title: '图片已选择', icon: 'success' });
    },
    fail: () => {
      uni.showToast({ title: '取消选择', icon: 'none' });
    },
  });
}

async function doSave() {
  if (!editPig.value) return;
  const farmerId = getFarmerId();
  if (!farmerId) return;

  // 校验：有体重则必须有图片
  const hasWeight = editForm.weightKg.trim() !== '';
  if (hasWeight) {
    const newWeight = Number(editForm.weightKg);
    if (isNaN(newWeight) || newWeight <= 0) {
      uni.showToast({ title: '体重须为正数', icon: 'none' }); return;
    }
    if (!editForm.weightImage) {
      uni.showToast({ title: '修改体重必须上传称重图片', icon: 'none' }); return;
    }
  }

  editSaving.value = true;
  try {
    const payload: Record<string, any> = {};
    if (hasWeight) {
      payload.weightKg = Number(editForm.weightKg);
      payload.weightImage = editForm.weightImage;
    }
    if (editForm.ownerNote.trim() !== '') {
      payload.ownerNote = editForm.ownerNote.trim();
    }

    if (Object.keys(payload).length === 0) {
      uni.showToast({ title: '未填写任何内容', icon: 'none' }); return;
    }

    await request(`/foster/pigs/${editPig.value.id}?farmerId=${farmerId}`, {
      method: 'PATCH',
      data: payload,
    });

    uni.showToast({ title: '更新成功', icon: 'success' });
    closeEdit();
    await load();
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally {
    editSaving.value = false;
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

.pig-card { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }

.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.pig-left { display: flex; align-items: center; gap: 16rpx; }
.pig-icon { font-size: 52rpx; }
.pig-name-wrap { display: flex; flex-direction: column; }
.pig-name { font-size: 34rpx; font-weight: 700; color: #222; }
.stall-no { font-size: 24rpx; color: #2d8a4e; margin-top: 4rpx; font-weight: 500; }

.health-tag { padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: 500; }
.health-tag.healthy { background: #f6ffed; color: #52c41a; }
.health-tag.sick { background: #fff1f0; color: #ff4d4f; }
.health-tag.recovering { background: #fff7e6; color: #fa8c16; }
.health-tag.unknown { background: #f5f5f5; color: #999; }

.divider { height: 1rpx; background: #f0f0f0; margin-bottom: 24rpx; }

.pig-stats { display: flex; align-items: center; }
.stat-item { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
.stat-val { font-size: 44rpx; font-weight: 800; color: #222; line-height: 1; }
.owner-val { font-size: 30rpx; font-weight: 600; color: #2d8a4e; }
.stat-unit { font-size: 22rpx; color: #999; margin-top: 2rpx; }
.stat-label { font-size: 24rpx; color: #aaa; margin-top: 8rpx; }
.stat-sep { width: 1rpx; height: 60rpx; background: #eee; }

.edit-bar { margin-top: 24rpx; border-top: 1rpx solid #f5f5f5; padding-top: 20rpx; }
.btn-edit-pig { height: 64rpx; border-radius: 32rpx; background: #f0faf4; display: flex; align-items: center; justify-content: center; }
.btn-edit-pig text { font-size: 26rpx; color: #2d8a4e; font-weight: 600; }

.footer-tip { text-align: center; padding: 24rpx; }
.tip-text { font-size: 24rpx; color: #bbb; }

/* ─── 弹层 ─── */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 40rpx 40rpx 60rpx; box-sizing: border-box; max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 34rpx; font-weight: 700; color: #222; display: block; margin-bottom: 4rpx; }
.modal-subtitle { font-size: 26rpx; color: #2d8a4e; display: block; margin-bottom: 32rpx; }

.modal-section { background: #fafafa; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.modal-label { font-size: 26rpx; color: #555; display: block; margin-bottom: 12rpx; font-weight: 500; }
.modal-label.mt { margin-top: 20rpx; }
.modal-input { border: 2rpx solid #eee; border-radius: 12rpx; height: 80rpx; padding: 0 20rpx; font-size: 28rpx; color: #333; background: #fff; display: block; }

.upload-btn { height: 120rpx; border: 2rpx dashed #ccc; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; gap: 8rpx; }
.upload-icon { font-size: 40rpx; }
.upload-text { font-size: 26rpx; color: #aaa; }

.weight-img-wrap { position: relative; display: inline-block; margin-bottom: 8rpx; }
.weight-img { width: 180rpx; height: 120rpx; border-radius: 12rpx; display: block; }
.del-img { position: absolute; top: -12rpx; right: -12rpx; width: 36rpx; height: 36rpx; border-radius: 18rpx; background: #ff4d4f; display: flex; align-items: center; justify-content: center; }
.del-text { color: #fff; font-size: 20rpx; }

.tip-note { font-size: 22rpx; color: #fa8c16; display: block; margin-top: 10rpx; line-height: 1.5; }

.modal-btns { display: flex; gap: 20rpx; margin-top: 32rpx; }
.modal-btn-cancel { flex: 1; height: 88rpx; border-radius: 44rpx; border: 2rpx solid #eee; display: flex; align-items: center; justify-content: center; }
.modal-btn-cancel text { font-size: 28rpx; color: #888; }
.modal-btn-save { flex: 2; height: 88rpx; border-radius: 44rpx; background: #2d8a4e; display: flex; align-items: center; justify-content: center; }
.modal-btn-save text { font-size: 30rpx; color: #fff; font-weight: 700; }
.modal-btn-save.saving { background: #aaa; }
</style>
