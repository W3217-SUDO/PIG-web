# frontend · uni-app 客户端

> 私人订猪客户端,基于 **uni-app + Vue3 + TypeScript + Pinia**。
> **一份代码编译成微信小程序 / 安卓 APP / iOS APP / H5。**

🔗 完整前端文档:[`../docs/04-frontend/`](../docs/04-frontend/)

---

## 快速启动

```bash
# 在仓库根目录
npm install

# 进入前端目录
cd frontend

# 编译小程序(开发,产物在 dist/dev/mp-weixin/)
npm run dev:mp-weixin

# 编译 APP(需要 HBuilderX 真机调试)
npm run dev:app

# 编译 H5(本机预览)
npm run dev:h5
```

然后:
- **小程序** → 用微信开发者工具打开 `dist/dev/mp-weixin/`
- **APP** → 用 HBuilderX 打开本目录,真机扫码运行
- **H5** → 浏览器访问 `http://localhost:5173`

更详细 → [`../docs/04-frontend/miniapp.md`](../docs/04-frontend/miniapp.md)

---

## 目录速览(本目录)

```
frontend/
├── src/
│   ├── pages/                # 业务页面(每个文件夹一个页面)
│   │   ├── home/             #   首页(Hero + 三大主张 + 拼猪 + 品种)
│   │   ├── about/            #   关于我们(8 段叙事长页)
│   │   ├── order/            #   下单流程(4 步)
│   │   ├── pigs/             #   我的猪圈
│   │   ├── pig-detail/       #   猪只详情(直播 + 喂养记录)
│   │   ├── share/            #   拼猪 / 分享码加入
│   │   ├── live/             #   直播
│   │   ├── farmer/           #   农户主页
│   │   ├── profile/          #   个人中心
│   │   └── message/          #   消息
│   ├── components/           # 跨页面通用组件
│   ├── api/                  # 后端 API 封装(axios / uni.request)
│   │   ├── request.ts        #   统一请求拦截(token / 错误)
│   │   ├── auth.ts
│   │   ├── pig.ts
│   │   ├── order.ts
│   │   └── share.ts
│   ├── store/                # Pinia 状态管理
│   │   ├── user.ts
│   │   └── pigs.ts
│   ├── utils/                # 工具函数
│   ├── static/               # 静态资源(图片 / 字体)
│   ├── App.vue
│   ├── main.ts
│   ├── pages.json            # uni-app 路由配置
│   └── manifest.json         # 多端编译配置
├── env/                      # 环境变量
│   ├── .env.development
│   └── .env.production
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 关键命令

| 命令 | 用途 |
|---|---|
| `npm run dev:mp-weixin` | 开发模式,编译微信小程序 |
| `npm run dev:app` | 开发模式,编译 APP |
| `npm run dev:h5` | 开发模式,启动 H5 dev server |
| `npm run build:mp-weixin` | 生产构建(小程序) |
| `npm run build:app` | 生产构建(APP) |
| `npm run build:h5` | 生产构建(H5) |
| `npm run lint` | ESLint + 自动修复 |
| `npm run type-check` | TypeScript 类型检查 |

---

## 平台差异处理(条件编译)

uni-app 用 `#ifdef` / `#ifndef` 在**同一文件**内区分平台:

```vue
<template>
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="getUserProfile">微信授权</button>
  <!-- #endif -->

  <!-- #ifdef APP-PLUS -->
  <view @tap="loginByPhone">手机号登录</view>
  <!-- #endif -->
</template>

<script setup lang="ts">
// #ifdef APP-PLUS
import { useNativeFeature } from '@/utils/native'
// #endif
</script>
```

完整平台差异手册 → [`../docs/04-frontend/miniapp.md`](../docs/04-frontend/miniapp.md)

---

## 环境变量

uni-app 的环境变量约定:

```bash
# env/.env.development
VITE_API_BASE=http://127.0.0.1:3000/api    # 本地后端
VITE_WS_BASE=ws://127.0.0.1:3000/ws

# env/.env.production
VITE_API_BASE=https://www.rockingwei.online/api
VITE_WS_BASE=wss://www.rockingwei.online/ws
```

> ⚠️ 微信小程序开发期记得在开发者工具勾选「不校验合法域名」,正式版需在小程序后台填好域名。详见 [`../docs/04-frontend/miniapp.md`](../docs/04-frontend/miniapp.md)
