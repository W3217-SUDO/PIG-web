# frontend · uni-app 客户端

> 私人订猪客户端,基于 **uni-app + Vue 3 + TypeScript + Vite**。
> 一份代码编译成 H5 / 微信小程序 / Android / iOS APP。

## 启动

```bash
# 在仓库根目录装依赖(workspaces 一并装好)
npm install

# H5 (浏览器, 端口 5173)
npm -w frontend run dev:h5

# 微信小程序 (产物在 dist/dev/mp-weixin/, 用微信开发者工具打开)
npm -w frontend run dev:mp-weixin

# APP (需要 HBuilderX 真机调试)
npm -w frontend run dev:app
```

后端默认在 `http://127.0.0.1:3000/api`,由 `docker-compose up -d` + `npm -w backend run start:dev` 起。

## 环境变量

`.env.development` (gitignored, 模板见 `.env.example`):

| 变量 | 用途 | 默认 |
|---|---|---|
| `VITE_API_BASE` | 后端 API 根路径 | `http://127.0.0.1:3000/api` |

## 请求封装

`src/utils/request.ts` 统一封装,跨 H5/小程序/APP:
- 用 `uni.request()`(三端通吃,而非 axios)
- 自动从 `uni.storage` 取 `pig:access_token` 加 Bearer
- 401 自动清 token
- 响应约定 `{ code, message, data }`,code=0 解 data,否则抛 `ApiError`

```ts
import { request, setToken } from '@/utils/request';
const me = await request<{ id: string }>('/auth/me');
```

## 首页

`src/pages/index/index.vue` 是当前的 demo 页:探活 + dev-login,用来验证整套链路。
真正的业务页(登录/首页/订单)按 `docs/04-frontend/` 的计划逐步加。
