# Postman / Apifox 集合

> 测试 API 用 **Apifox**(推荐,国内速度快 + 中文 + Mock 强)。Postman 兼容。

---

## 一、获取集合

仓库里:
```
docs/postman/pig-web.postman_collection.json
docs/postman/pig-web.postman_environment.json
```

> 集合文件随接口同步更新——加新接口时,**导出最新版本并 commit**。

---

## 二、环境变量

`pig-web.postman_environment.json` 里定义了环境:

| Key | Local | Staging | Production |
|---|---|---|---|
| `base_url` | `http://127.0.0.1:3000/api` | `https://staging.rockingwei.online/api` | `https://www.rockingwei.online/api` |
| `access_token` | — | — | — |
| `refresh_token` | — | — | — |
| `user_id` | — | — | — |
| `pig_id` | — | — | — |
| `order_id` | — | — | — |
| `share_code` | — | — | — |

`access_token` 等会在登录接口的 **Tests** 脚本里自动写入,不用手动复制。

---

## 三、登录(自动设置 token)

请求:
```
POST {{base_url}}/debug/seed/user
{
  "nickname": "调试A",
  "phone": "13800138001"
}
```

Tests 标签页(响应后执行):
```js
const data = pm.response.json().data;
pm.environment.set('access_token', data.access_token);
pm.environment.set('refresh_token', data.refresh_token);
pm.environment.set('user_id', data.user.id);
```

后续所有请求 Header:
```
Authorization: Bearer {{access_token}}
```

---

## 四、Pre-request 脚本

集合根级 Pre-request:

```js
// 给所有 POST 自动生成 Idempotency-Key
if (pm.request.method === 'POST') {
  pm.request.headers.add({
    key: 'Idempotency-Key',
    value: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
  });
}

// 默认 trace_id
pm.request.headers.add({
  key: 'X-Trace-Id',
  value: 'pm_' + Date.now(),
});
```

---

## 五、集合目录结构

```
pig-web/
├── 0. 健康检查 / 调试
│   ├── GET  /health
│   ├── GET  /debug/routes
│   └── POST /debug/seed/user
├── 1. 认证 Auth
│   ├── POST /auth/wx-login        (含 Tests 写入 token)
│   ├── POST /auth/sms/send
│   ├── POST /auth/sms-login
│   ├── POST /auth/refresh
│   └── POST /auth/logout
├── 2. 用户 User
│   ├── GET    /users/me
│   ├── PATCH  /users/me
│   ├── GET    /users/me/addresses
│   ├── POST   /users/me/addresses
│   └── DELETE /users/me/addresses/:id
├── 3. 农户 Farmer
│   ├── GET /farmers
│   ├── GET /farmers/:id
│   └── GET /farmers/:id/pigs
├── 4. 猪只 Pig
│   ├── GET /pigs
│   ├── GET /pigs/:id
│   ├── GET /pigs/:id/timeline
│   └── GET /my/pigs
├── 5. 订单 Order
│   ├── POST /orders
│   ├── GET  /orders/:id
│   ├── GET  /orders/me
│   ├── POST /orders/:id/cancel
│   └── POST /orders/:id/mature-action
├── 6. 拼猪 Share
│   ├── POST /orders/:id/share
│   ├── GET  /share/:code
│   ├── POST /share/:code/join
│   ├── GET  /share/:code/members
│   ├── POST /share/:code/leave
│   └── POST /share/:code/kick
├── 7. 喂养 Feeding
│   ├── POST /feeding/checkin
│   ├── GET  /feeding/pig/:pigId
│   └── GET  /feeding/farmer/me/today
├── 8. 健康 Health
│   ├── POST /health/record
│   └── GET  /health/pig/:pigId
├── 9. 直播 Live
│   ├── GET /live/:pigId/stream
│   ├── GET /live/:pigId/viewers
│   └── GET /live/:pigId/playbacks
├── 10. 钱包 Wallet
│   ├── GET  /wallet/me
│   ├── POST /wallet/topup
│   └── GET  /wallet/transactions
├── 11. 消息 Message
│   ├── GET  /messages
│   ├── PATCH /messages/:id/read
│   └── POST /messages/read-all
├── 12. 上传 Upload
│   ├── POST /upload/image
│   └── POST /upload/video
└── 99. 支付回调 Pay (微信侧调用,模拟用)
    └── POST /debug/wx-pay/notify
```

---

## 六、Apifox 在线团队空间(后续配置)

考虑迁到 Apifox 团队空间,自动从 NestJS Swagger 同步:

1. 后端跑起来后,Apifox → 项目设置 → 数据源 → 拉取 `http://127.0.0.1:3000/api/docs-json`
2. Apifox 自动生成集合 + Mock
3. 前端开发可以直接用 Apifox Mock 服务

集合 URL(占位):`https://apifox.com/apidoc/shared-xxx`

---

## 七、必备测试用例(Smoke Test)

每次后端发布前,跑这一套:

```
✅ GET  /health                                    → 200 ok
✅ POST /debug/seed/user                           → 200,返回 token
✅ GET  /users/me  (用上面 token)                  → 200,user_id 一致
✅ GET  /pigs                                      → 200,数组
✅ POST /orders   (合法 dto)                       → 201
✅ POST /debug/wx-pay/notify  (上一步的 order)     → 200
✅ POST /orders/:id/share                          → 201,生成 code
✅ POST /share/:code/join (用新 token)             → 200
✅ GET  /pigs/:id (拼猪后)                         → 200(能看到)
```

10 个请求,1 分钟跑完。

---

## 八、Newman 命令行运行

CI 中可以用 Newman 跑 Postman 集合:

```bash
npm i -g newman

newman run docs/postman/pig-web.postman_collection.json \
  --environment docs/postman/local.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export newman-report.json
```

GitHub Actions 集成见 [`../06-deployment/ci-cd.md`](../06-deployment/ci-cd.md)。

---

## 九、注意事项

- 调试用 token **不要泄露**(虽然只是测试)
- 不要把 `production` 环境的 token / 真用户 ID 写进集合
- 集合文件 commit 时,**清空 token 字段**(`{{access_token}}` 占位即可)

---

## 十、占位说明

`docs/postman/pig-web.postman_collection.json` 文件**还未创建**,等后端接口实现后,导出一份 commit 进去。

任务:
- [ ] 等 P0 模块(auth/user/pig/order/wallet)做完
- [ ] 在 Apifox 整理一套
- [ ] 导出 JSON 进 `docs/postman/`
- [ ] 写 Newman 跑通脚本
