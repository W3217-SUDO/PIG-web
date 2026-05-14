<template>
  <view class="login-page">
    <view class="logo-area">
      <text class="pig-emoji">🐷</text>
      <text class="app-name">私人订猪</text>
      <text class="app-sub">代养人工作台</text>
    </view>

    <!-- ── 主卡片 ── -->
    <view class="card">

      <!-- 已登录状态：快捷入口 -->
      <view v-if="step === 'logged_in'" class="logged-in-section">
        <view class="current-farmer-bar">
          <view class="current-info">
            <text class="current-label">当前身份</text>
            <text class="current-name">{{ currentFarmerName }}</text>
          </view>
          <view class="btn-go" @tap="goWorkbench">
            <text class="btn-go-text">进入工作台 →</text>
          </view>
        </view>
        <view class="divider-row">
          <view class="divider-line" />
          <text class="divider-text">或切换账号</text>
          <view class="divider-line" />
        </view>
        <button class="btn-wx" @tap="startWxLogin">
          <text class="btn-wx-icon">微信</text>
          <text class="btn-wx-text">切换微信账号登录</text>
        </button>
        <view class="admin-link" @tap="goAdmin">
          <text class="admin-text">⚙️ 管理员入口</text>
        </view>
      </view>

      <!-- 初始登录状态 -->
      <view v-else-if="step === 'init'">
        <text class="card-title">欢迎！请登录您的代养人账号</text>
        <button class="btn-wx" :disabled="wxLoading" @tap="startWxLogin">
          <text class="btn-wx-icon">微信</text>
          <text class="btn-wx-text">{{ wxLoading ? '登录中…' : '微信一键登录' }}</text>
        </button>
        <view class="admin-link" @tap="goAdmin">
          <text class="admin-text">⚙️ 管理员入口</text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-else-if="step === 'loading'" class="center">
        <text class="gray-text">{{ loadingText }}</text>
      </view>

      <!-- 选择已有农户绑定（unbound 流程） -->
      <view v-else-if="step === 'select_farmer'">
        <text class="card-title">选择您的农户身份</text>
        <text class="card-sub">首次微信登录，请选择您对应的农户账号完成绑定。绑定后下次无需再选。</text>
        <view
          v-for="f in unboundFarmers"
          :key="f.id"
          class="farmer-item"
          :class="{ selected: selectedId === f.id }"
          @tap="selectedId = f.id"
        >
          <view class="avatar-text">{{ f.name.slice(0, 1) }}</view>
          <view class="info">
            <text class="name">{{ f.name }}</text>
            <text class="meta">{{ f.region }} 散养农户</text>
          </view>
          <text v-if="selectedId === f.id" class="check">✓</text>
        </view>
        <view class="no-account-row" @tap="step = 'register'">
          <text class="no-account-text">→ 没有我的账号，新建一个</text>
        </view>
        <button class="btn-login" :disabled="!selectedId || bindLoading" @tap="confirmBind">
          {{ bindLoading ? '绑定中…' : '确认绑定并进入工作台' }}
        </button>
        <view class="back-row" @tap="step = 'init'">
          <text class="back-text">← 返回</text>
        </view>
      </view>

      <!-- 新用户注册表单（new_user 流程） -->
      <view v-else-if="step === 'register'">
        <text class="card-title">创建代养人账号</text>
        <text class="card-sub">您的微信暂未绑定任何农户账号，填写信息完成注册。</text>
        <view class="form-item">
          <text class="form-label">真名 / 化名</text>
          <input class="form-input" v-model="regForm.name" placeholder="如：老李" maxlength="20" />
        </view>
        <view class="form-item">
          <text class="form-label">所在地区</text>
          <input class="form-input" v-model="regForm.region" placeholder="如：广元市" maxlength="30" />
        </view>
        <view class="form-item">
          <text class="form-label">散养年限</text>
          <input class="form-input" v-model="regForm.years" type="number" placeholder="如：5" maxlength="3" />
        </view>
        <button class="btn-login" :disabled="!regForm.name || !regForm.region || regLoading" @tap="confirmRegister">
          {{ regLoading ? '注册中…' : '注册并进入工作台' }}
        </button>
        <view class="back-row" @tap="goBackFromRegister">
          <text class="back-text">← 返回选择已有账号</text>
        </view>
      </view>

      <!-- 开发者模式登录（dev_mode — 无真实 AppSecret 时） -->
      <view v-else-if="step === 'dev_mode'">
        <text class="card-title">开发者模式登录</text>
        <text class="card-sub">⚠️ 非生产环境，请输入农户姓名直接登录（跳过微信验证）</text>
        <view class="form-item">
          <text class="form-label">农户姓名</text>
          <input class="form-input" v-model="devName" placeholder="如：老李" maxlength="20" />
        </view>
        <button class="btn-login" :disabled="!devName || devLoading" @tap="confirmDevLogin">
          {{ devLoading ? '登录中…' : '登录' }}
        </button>
        <view class="divider-row" style="margin-top: 24rpx;">
          <view class="divider-line" />
          <text class="divider-text">或选择农户</text>
          <view class="divider-line" />
        </view>
        <!-- 快速选择列表 -->
        <view
          v-for="f in devFarmerList"
          :key="f.id"
          class="farmer-item"
          :class="{ selected: selectedId === f.id }"
          @tap="quickDevSelect(f)"
        >
          <view class="avatar-text">{{ f.name.slice(0, 1) }}</view>
          <view class="info">
            <text class="name">{{ f.name }}</text>
            <text class="meta">{{ f.region }} · 散养 {{ f.years }} 年</text>
          </view>
          <text v-if="selectedId === f.id" class="check">✓</text>
        </view>
        <view class="admin-link" @tap="goAdmin">
          <text class="admin-text">⚙️ 管理员入口</text>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request, setFarmerId, getFarmerId, setFosterToken, clearAuth } from '../../../utils/fosterRequest';

type Step = 'init' | 'logged_in' | 'loading' | 'select_farmer' | 'register' | 'dev_mode';

interface FarmerItem {
  id: string;
  name: string;
  region: string;
  years: number;
}

const step = ref<Step>('init');
const loadingText = ref('登录中，请稍候…');
const wxLoading = ref(false);
const bindLoading = ref(false);
const regLoading = ref(false);
const devLoading = ref(false);

const currentFarmerName = ref('');
const selectedId = ref('');

// unbound 流程
const pendingOpenid = ref('');
const unboundFarmers = ref<FarmerItem[]>([]);

// 注册表单
const regForm = ref({ name: '', region: '', years: '' });

// dev mode
const devName = ref('');
const devFarmerList = ref<FarmerItem[]>([]);

onMounted(async () => {
  const farmerId = getFarmerId();
  if (farmerId) {
    try {
      const farmers = await request<FarmerItem[]>('/foster/farmers');
      const found = farmers.find(f => f.id === farmerId);
      if (found) {
        currentFarmerName.value = found.name;
        step.value = 'logged_in';
        return;
      }
    } catch { /* ignore */ }
    clearAuth();
  }
  step.value = 'init';
});

async function startWxLogin() {
  wxLoading.value = true;
  step.value = 'loading';
  loadingText.value = '正在获取微信授权…';
  try {
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (res) => {
          if (res.code) resolve(res.code);
          else reject(new Error('微信授权失败，请重试'));
        },
        fail: (err) => reject(new Error((err as any).errMsg || '微信授权失败')),
      });
    });

    loadingText.value = '验证身份中…';
    const result = await request<any>('/foster/auth/login', {
      method: 'POST',
      data: { code },
    });

    if (result.type === 'success') {
      setFarmerId(result.farmerId);
      setFosterToken(result.token);
      uni.reLaunch({ url: '/pages/foster/workbench/index' });
    } else if (result.type === 'unbound') {
      pendingOpenid.value = result.openid;
      unboundFarmers.value = result.farmers;
      step.value = 'select_farmer';
    } else if (result.type === 'new_user') {
      pendingOpenid.value = result.openid;
      step.value = 'register';
    } else if (result.type === 'dev_mode') {
      await loadDevFarmers();
      step.value = 'dev_mode';
    }
  } catch (err: any) {
    step.value = 'init';
    uni.showToast({ title: err.message || '登录失败，请重试', icon: 'none', duration: 3000 });
  } finally {
    wxLoading.value = false;
  }
}

async function loadDevFarmers() {
  try {
    devFarmerList.value = await request<FarmerItem[]>('/foster/farmers');
  } catch { /* ignore */ }
}

async function confirmBind() {
  if (!selectedId.value || !pendingOpenid.value) return;
  bindLoading.value = true;
  try {
    const result = await request<{ farmerId: string; farmerName: string; token: string }>(
      '/foster/auth/bind',
      { method: 'POST', data: { openid: pendingOpenid.value, farmerId: selectedId.value } },
    );
    setFarmerId(result.farmerId);
    setFosterToken(result.token);
    uni.reLaunch({ url: '/pages/foster/workbench/index' });
  } catch (err: any) {
    uni.showToast({ title: err.message || '绑定失败，请重试', icon: 'none', duration: 3000 });
  } finally {
    bindLoading.value = false;
  }
}

async function confirmRegister() {
  if (!regForm.value.name || !regForm.value.region) return;
  regLoading.value = true;
  try {
    const result = await request<{ farmerId: string; farmerName: string; token: string }>(
      '/foster/auth/register',
      {
        method: 'POST',
        data: {
          openid: pendingOpenid.value,
          name: regForm.value.name.trim(),
          region: regForm.value.region.trim(),
          years: parseInt(regForm.value.years) || 1,
        },
      },
    );
    setFarmerId(result.farmerId);
    setFosterToken(result.token);
    uni.reLaunch({ url: '/pages/foster/workbench/index' });
  } catch (err: any) {
    uni.showToast({ title: err.message || '注册失败，请重试', icon: 'none', duration: 3000 });
  } finally {
    regLoading.value = false;
  }
}

async function confirmDevLogin() {
  if (!devName.value.trim()) return;
  devLoading.value = true;
  try {
    const result = await request<{ farmerId: string; farmerName: string; token: string }>(
      '/foster/auth/dev-login',
      { method: 'POST', data: { name: devName.value.trim() } },
    );
    setFarmerId(result.farmerId);
    setFosterToken(result.token);
    uni.reLaunch({ url: '/pages/foster/workbench/index' });
  } catch (err: any) {
    uni.showToast({ title: err.message || '找不到该农户', icon: 'none', duration: 3000 });
  } finally {
    devLoading.value = false;
  }
}

async function quickDevSelect(f: FarmerItem) {
  selectedId.value = f.id;
  devName.value = f.name;
  await confirmDevLogin();
}

function goBackFromRegister() {
  if (unboundFarmers.value.length > 0) {
    step.value = 'select_farmer';
  } else {
    step.value = 'init';
  }
}

function goWorkbench() {
  uni.reLaunch({ url: '/pages/foster/workbench/index' });
}

function goAdmin() {
  uni.navigateTo({ url: '/pages/foster/admin/index' });
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1a6b35 0%, #2d8a4e 50%, #3da862 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx 60rpx;
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

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
  display: block;
  margin-bottom: 12rpx;
}
.card-sub {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-bottom: 28rpx;
  line-height: 1.6;
}

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
.btn-go {
  background: #2d8a4e;
  border-radius: 30rpx;
  padding: 12rpx 28rpx;
}
.btn-go-text { font-size: 26rpx; color: #fff; font-weight: 600; }

.divider-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.divider-line { flex: 1; height: 1rpx; background: #e8e8e8; }
.divider-text { font-size: 22rpx; color: #bbb; padding: 0 16rpx; }

.btn-wx {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #07c160;
  border-radius: 50rpx;
  height: 96rpx;
  margin-bottom: 20rpx;
  border: none;
}
.btn-wx-icon { font-size: 32rpx; margin-right: 12rpx; color: #fff; font-weight: 700; }
.btn-wx-text { font-size: 32rpx; color: #fff; font-weight: 600; }
.btn-wx[disabled] { background: #ccc; }

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
.info { flex: 1; }
.name { font-size: 32rpx; font-weight: 600; color: #222; display: block; }
.meta { font-size: 24rpx; color: #888; margin-top: 4rpx; display: block; }
.check { font-size: 36rpx; color: #2d8a4e; font-weight: 700; }

.no-account-row { padding: 16rpx 0; }
.no-account-text { font-size: 26rpx; color: #2d8a4e; }

.btn-login {
  margin-top: 24rpx;
  background: #2d8a4e;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  height: 96rpx;
  line-height: 96rpx;
  width: 100%;
}
.btn-login[disabled] { background: #ccc; }

.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #555; display: block; margin-bottom: 10rpx; }
.form-input {
  width: 100%;
  height: 84rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fafafa;
}

.back-row { margin-top: 24rpx; text-align: center; padding: 10rpx; }
.back-text { font-size: 26rpx; color: #888; }
.admin-link { margin-top: 24rpx; text-align: center; padding: 16rpx; }
.admin-text { font-size: 24rpx; color: #2d8a4e; }

.center { text-align: center; padding: 60rpx; }
.gray-text { font-size: 28rpx; color: #aaa; }
</style>
