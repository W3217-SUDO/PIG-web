# 微信小程序开发指南

> 用 **uni-app + Vue3 + TS** 编译微信小程序。本文是写小程序的"操作手册"。

---

## 一、开发环境

1. 安装好微信开发者工具(见 [`../01-getting-started/prerequisites.md`](../01-getting-started/prerequisites.md))
2. 配置好仓库,装好依赖
3. 拿到小程序 AppID(找团队要)

---

## 二、首次运行

```bash
# 仓库根目录
npm install

# 启动小程序编译(watch 模式)
npm run dev:client:mp

# 输出会持续:
# build for development:mp-weixin
# Output: frontend/dist/dev/mp-weixin/
```

打开微信开发者工具:
1. 「导入项目」
2. 项目目录:`frontend/dist/dev/mp-weixin/`
3. AppID:用项目 AppID 或者「测试号」
4. **右上角 详情 → 本地设置**:
   - ✅ 不校验合法域名、TLS 版本以及 HSTS(开发期必须开)
   - ✅ ES6 → ES5
   - ✅ 增强编译

---

## 三、目录结构

```
frontend/src/
├── pages/                  # 业务页面(对应 pages.json 配置)
│   ├── home/
│   │   ├── index.vue       #   首页
│   │   └── components/     #   该页面专属组件
│   ├── about/
│   ├── order/
│   ├── pigs/
│   ├── pig-detail/
│   ├── share/
│   ├── profile/
│   └── ...
├── components/             # 跨页面通用组件
│   ├── PigCard.vue
│   ├── FarmerAvatar.vue
│   └── LivePlayer.vue
├── api/                    # 接口封装
│   ├── request.ts          #   uni.request 统一封装
│   ├── auth.ts
│   ├── pig.ts
│   ├── order.ts
│   └── types.ts            #   与后端 DTO 对齐的类型
├── store/                  # Pinia
├── utils/
├── static/                 # 静态资源
├── App.vue
├── main.ts
├── pages.json              # 路由
└── manifest.json           # 编译配置
```

---

## 四、pages.json(路由 + tabBar)

```json
{
  "pages": [
    { "path": "pages/home/index", "style": { "navigationStyle": "custom" } },
    { "path": "pages/about/index", "style": { "navigationBarTitleText": "关于我们" } },
    { "path": "pages/order/select-breed", "style": { "navigationBarTitleText": "选择品种" } },
    { "path": "pages/order/select-farmer", "style": { "navigationBarTitleText": "选择农户" } },
    { "path": "pages/order/select-insurance", "style": { "navigationBarTitleText": "选择保险" } },
    { "path": "pages/order/confirm", "style": { "navigationBarTitleText": "确认订单" } },
    { "path": "pages/pigs/index", "style": { "navigationBarTitleText": "我的猪圈" } },
    { "path": "pages/pig-detail/index", "style": { "navigationStyle": "custom" } },
    { "path": "pages/share/invite", "style": { "navigationBarTitleText": "邀请拼猪" } },
    { "path": "pages/share/join", "style": { "navigationBarTitleText": "加入拼猪" } },
    { "path": "pages/profile/index", "style": { "navigationBarTitleText": "我的" } }
  ],
  "tabBar": {
    "color": "#999",
    "selectedColor": "#c0392b",
    "borderStyle": "white",
    "list": [
      { "pagePath": "pages/home/index", "text": "首页", "iconPath": "static/tab-bar/home.png", "selectedIconPath": "static/tab-bar/home-on.png" },
      { "pagePath": "pages/order/select-breed", "text": "订猪", "iconPath": "static/tab-bar/order.png", "selectedIconPath": "static/tab-bar/order-on.png" },
      { "pagePath": "pages/pigs/index", "text": "我的猪圈", "iconPath": "static/tab-bar/pigs.png", "selectedIconPath": "static/tab-bar/pigs-on.png" },
      { "pagePath": "pages/profile/index", "text": "我的", "iconPath": "static/tab-bar/me.png", "selectedIconPath": "static/tab-bar/me-on.png" }
    ]
  },
  "globalStyle": {
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#FFF8EE"
  }
}
```

---

## 五、API 请求封装

### `src/api/request.ts`

```ts
import { useUserStore } from '@/store/user';

interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

const API_BASE = import.meta.env.VITE_API_BASE; // http://127.0.0.1:3000/api

export function request<T = any>(opts: UniApp.RequestOptions): Promise<T> {
  const userStore = useUserStore();
  const token = userStore.accessToken;

  return new Promise((resolve, reject) => {
    uni.request({
      ...opts,
      url: API_BASE + opts.url,
      header: {
        ...opts.header,
        Authorization: token ? `Bearer ${token}` : '',
        'Idempotency-Key': opts.method === 'POST' ? generateIdemKey() : undefined,
      },
      success: async (res) => {
        const body = res.data as ApiResponse<T>;

        // 业务码非 0,根据情况处理
        if (body.code !== 0) {
          // token 失效:尝试 refresh,重试一次
          if (body.code === 10002 || body.code === 10003) {
            try {
              await userStore.refreshToken();
              return resolve(await request(opts));   // 重新请求
            } catch {
              userStore.logout();
              uni.reLaunch({ url: '/pages/home/index' });
              return reject(body);
            }
          }

          uni.showToast({ title: body.message, icon: 'none' });
          return reject(body);
        }

        resolve(body.data);
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

// 简便方法
export const get = <T>(url: string, params?: any) =>
  request<T>({ url, method: 'GET', data: params });

export const post = <T>(url: string, data?: any) =>
  request<T>({ url, method: 'POST', data });
```

### `src/api/order.ts`

```ts
import { post, get } from './request';
import type { Order, CreateOrderDto } from './types';

export const orderApi = {
  create: (dto: CreateOrderDto) => post<{ order: Order; wx_prepay: any }>('/orders', dto),
  get: (id: string) => get<Order>(`/orders/${id}`),
  listMine: () => get<{ items: Order[] }>('/orders/me'),
  cancel: (id: string) => post(`/orders/${id}/cancel`),
};
```

---

## 六、Pinia Store

### `src/store/user.ts`

```ts
import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: uni.getStorageSync('user') || null,
    accessToken: uni.getStorageSync('access_token') || '',
    refreshTokenStr: uni.getStorageSync('refresh_token') || '',
  }),
  getters: {
    isLogin: (s) => !!s.accessToken,
  },
  actions: {
    async wxLogin() {
      // 1. 拿微信 code
      const { code } = await uni.login({ provider: 'weixin' });
      // 2. 调后端
      const res = await authApi.wxLogin(code);
      // 3. 持久化
      this.user = res.user;
      this.accessToken = res.access_token;
      this.refreshTokenStr = res.refresh_token;
      uni.setStorageSync('user', res.user);
      uni.setStorageSync('access_token', res.access_token);
      uni.setStorageSync('refresh_token', res.refresh_token);
    },

    async refreshToken() {
      const res = await authApi.refresh(this.refreshTokenStr);
      this.accessToken = res.access_token;
      this.refreshTokenStr = res.refresh_token;
      uni.setStorageSync('access_token', res.access_token);
      uni.setStorageSync('refresh_token', res.refresh_token);
    },

    logout() {
      this.user = null;
      this.accessToken = '';
      this.refreshTokenStr = '';
      uni.removeStorageSync('user');
      uni.removeStorageSync('access_token');
      uni.removeStorageSync('refresh_token');
    },
  },
});
```

---

## 七、首页页面骨架

### `src/pages/home/index.vue`

```vue
<template>
  <view class="home">
    <!-- Hero -->
    <view class="hero">
      <text class="brand" @tap="goAbout">私 人 订 猪</text>
      <text class="title">认一头猪\n过一个年</text>
      <view class="cta-row">
        <button class="cta primary" @tap="goOrder">立 即 认 养</button>
        <button class="cta ghost" @tap="goLive">看实景直播</button>
      </view>
    </view>

    <!-- 三大主张横滑 -->
    <ValueCarousel />

    <!-- 直播 + 农户混排 -->
    <LiveMixCard :live-info="liveInfo" :farmers="farmers" />

    <!-- 4 步流程 -->
    <FlowSteps />

    <!-- 拼猪 -->
    <ShareSection @start="goOrder" />

    <!-- 品种 -->
    <BreedList :breeds="breeds" @select="goOrder" />

    <!-- 关于我们入口 -->
    <AboutEntry @tap="goAbout" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pigApi } from '@/api/pig';
import { farmerApi } from '@/api/farmer';

const breeds = ref([]);
const farmers = ref([]);
const liveInfo = ref({ viewers: 0 });

onMounted(async () => {
  const [b, f] = await Promise.all([
    pigApi.listBreeds(),
    farmerApi.listFeatured(),
  ]);
  breeds.value = b;
  farmers.value = f;
});

function goOrder() { uni.switchTab({ url: '/pages/order/select-breed' }); }
function goLive() { uni.navigateTo({ url: '/pages/live/index' }); }
function goAbout() { uni.navigateTo({ url: '/pages/about/index' }); }
</script>
```

---

## 八、平台差异处理

### 条件编译

```vue
<template>
  <!-- 只在微信小程序里渲染 -->
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="getUserProfile" @tap="getProfile">获取头像</button>
  <!-- #endif -->

  <!-- 只在 APP 里渲染 -->
  <!-- #ifdef APP-PLUS -->
  <view @tap="openExternalUrl">官网</view>
  <!-- #endif -->
</template>

<script setup>
async function getProfile() {
  // #ifdef MP-WEIXIN
  const profile = await uni.getUserProfile({ desc: '完善资料' });
  // #endif
}
</script>
```

### 常用条件

| 条件 | 含义 |
|---|---|
| `MP-WEIXIN` | 微信小程序 |
| `MP-ALIPAY` | 支付宝小程序 |
| `MP-` | 任何小程序 |
| `APP-PLUS` | APP |
| `H5` | H5 |
| `APP-PLUS\|\|H5` | APP 或 H5 |

---

## 九、登录态守护

### 路由守卫(NEED_AUTH 列表)

```ts
// src/utils/auth-guard.ts
const NEED_AUTH = ['/pages/pigs/index', '/pages/order/', '/pages/profile/'];

uni.addInterceptor('navigateTo', {
  invoke(args) {
    if (NEED_AUTH.some(p => args.url.startsWith(p)) && !useUserStore().isLogin) {
      useUserStore().wxLogin().then(() => uni.navigateTo(args));
      return false;
    }
    return args;
  },
});
```

---

## 十、文件上传

```ts
// src/api/upload.ts
export async function uploadImage(filePath: string): Promise<{ url: string }> {
  const userStore = useUserStore();
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: import.meta.env.VITE_API_BASE + '/upload/image',
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${userStore.accessToken}` },
      success: (res) => resolve(JSON.parse(res.data).data),
      fail: reject,
    });
  });
}
```

---

## 十一、小程序后台配置(上线必填)

详见 [`../01-getting-started/server-setup.md`](../01-getting-started/server-setup.md)。

需要在小程序后台「开发管理 → 服务器域名」填:

| 字段 | 值 |
|---|---|
| request 合法域名 | `https://www.rockingwei.online` |
| socket 合法域名 | `wss://www.rockingwei.online` |
| uploadFile 合法域名 | `https://www.rockingwei.online` |
| downloadFile 合法域名 | `https://www.rockingwei.online` |
| DNS 预解析域名 | `www.rockingwei.online`(不带 https) |
| 预连接域名 | `https://www.rockingwei.online` |

---

## 十二、上传 + 审核流程(后续)

1. 微信开发者工具 → **上传**
2. 写版本号 + 备注
3. 小程序后台 → **版本管理** → 选刚上传的版本 → **提交审核**
4. 微信审核 1–3 天
5. 通过 → **发布**

第一次上传前的 checklist:
- [ ] AppID 正确
- [ ] 服务器域名已配
- [ ] 隐私协议已配
- [ ] 用户类目准确
- [ ] 关闭"不校验合法域名"开关再测一遍
- [ ] 真机测过下单 / 拼猪 / 看猪流程
