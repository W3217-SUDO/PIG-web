# 上线闭环补齐设计：登录 / 上传 / 拼猪 / 支付骨架

日期：2026-05-24
分支：dev
目标版本：v1 可上线闭环

## 1. 背景

当前项目已经具备 NestJS 后端、uni-app 前端、猪只列表、下单、钱包 mock、分享码、代养人端和部分管理入口。但仍有几处会阻塞真实上线或真实体验：

- 微信登录依赖真实 AppID/AppSecret，当前存在 dev-login 兜底。
- 图片上传模块缺失，头像、猪只图片、喂养记录图片无法形成统一入口。
- 拼猪只支持生成分享码和公开查看，不能加入、不能看成员。
- 支付仍以 mock 为主，缺少 pay 模块边界和真实微信支付接入点。
- 对应 e2e 和 API 状态文档需要同步。

本阶段不追求一次性做完整商业系统，而是先补齐「用户能跑通主链路」的工程闭环。

## 2. 范围

本阶段交付以下内容：

1. upload 模块
   - `POST /api/upload/image`
   - 登录用户上传图片到本地 `uploads/` 目录。
   - 返回 `{ url, path, filename, size, mimeType }`。
   - 限制图片类型和大小。
   - 预留 COS 替换边界。

2. share 模块增强
   - `POST /api/share/:code/join`
   - `GET /api/share/:code/members`
   - 受邀人登录后可加入拼猪围观组。
   - 主认领人天然是 host。
   - 成员只能看，不能改订单、退款、踢人。

3. pay 模块骨架
   - `POST /api/pay/orders/:orderId/mock-prepay`
   - `POST /api/pay/wx-notify`
   - `GET /api/pay/orders/:orderId/status`
   - 当前先把支付边界和幂等入口建好，真实微信支付参数未齐时不阻塞。
   - mock 仍只在非 production 环境可用。

4. 前端最小闭环
   - 分享落地页新增“登录并加入拼猪”。
   - 订单列表/详情可展示分享入口和成员入口。
   - 个人资料页使用 upload 接口上传头像。

5. 测试与文档
   - 后端新增 upload/share/pay smoke e2e。
   - 更新 `docs/03-backend/api-status.md`。
   - 更新 `docs/TASKS.md` 中对应状态。

## 3. 非范围

本阶段明确不做：

- 真实微信支付 JSAPI 下单和签名。
- 退款真实调用微信商户平台。
- COS 直传。
- 真实直播流。
- 农户喂养图片打卡完整后台审核。
- 完整 GUI 管理后台。
- 拼猪付款分账、分肉规则、踢人/退出。

## 4. 数据模型

### 4.1 上传

新增 `upload_asset` 表：

- `id` ULID
- `user_id` nullable，上传人
- `kind` enum: `image`
- `storage` enum: `local`, future `cos`
- `filename`
- `original_name`
- `mime_type`
- `size`
- `path`
- `url`
- `created_at`
- `updated_at`

### 4.2 拼猪成员

复用或扩展现有 share 相关实体。如果现有 `share` 表只表达订单分享码，则新增 `share_member`：

- `id` ULID
- `share_id`
- `user_id`
- `role` enum: `host`, `member`
- `joined_at`
- 唯一键：`share_id + user_id`

如果现有 `share.entity.ts` 已经能承载成员关系，优先按现有模型最小改造。

### 4.3 支付骨架

不新增复杂表，优先复用 `order_payment`。真实微信支付接入后再补字段：

- `prepay_id`
- `transaction_id`
- `raw_payload`
- `status`

## 5. 接口设计

### 5.1 上传

`POST /api/upload/image`

- 鉴权：JWT
- Content-Type：`multipart/form-data`
- 字段：`file`
- 限制：5MB，`image/jpeg|image/png|image/webp|image/gif`
- 返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "url": "https://www.rockingwei.online/uploads/xxx.webp",
    "filename": "xxx.webp",
    "size": 12345,
    "mimeType": "image/webp"
  }
}
```

### 5.2 拼猪

`POST /api/share/:code/join`

- 鉴权：JWT
- 行为：加入该分享码对应订单的围观/拼猪成员。
- 幂等：重复加入返回已有成员信息。

`GET /api/share/:code/members`

- 鉴权：JWT
- 权限：主认领人或成员可看。
- 返回 host + members。

### 5.3 支付

`POST /api/pay/orders/:orderId/mock-prepay`

- 鉴权：JWT
- 非 production 可用。
- 返回 mock 支付参数或直接复用 mock-paid 结果。

`POST /api/pay/wx-notify`

- 鉴权：公开。
- 当前返回明确的未配置状态，不误判为成功。
- 后续接 API v3 签名校验。

`GET /api/pay/orders/:orderId/status`

- 鉴权：JWT
- 返回订单支付状态和最近一条 payment。

## 6. 错误处理

- 文件过大：`400 UPLOAD_FILE_TOO_LARGE`
- 类型不支持：`400 UPLOAD_INVALID_TYPE`
- 分享码不存在/过期：`404 SHARE_NOT_FOUND`
- 非成员查看成员列表：`403 SHARE_FORBIDDEN`
- 生产环境调用 mock 支付：`403 MOCK_PAY_DISABLED`
- 微信支付未配置：`503 WXPAY_NOT_CONFIGURED`

错误响应继续遵循 `{ code, message, data }`。

## 7. 前端行为

1. 分享落地页
   - 未登录：展示猪只信息 + “登录后加入拼猪”。
   - 已登录未加入：展示“加入一起看猪”。
   - 已加入：展示“已加入，可去看猪”。

2. 个人资料页
   - 点击头像选择图片。
   - 调 `/upload/image`。
   - 成功后 PATCH `/users/me` 更新头像。

3. 订单页
   - 已支付订单展示“邀请家人一起看”。
   - 如果分享码已生成，展示复制链接。
   - 成员列表入口先简化成弹窗列表。

## 8. 验证标准

- 后端 build 通过。
- 后端 e2e 至少覆盖：上传失败/成功、分享加入幂等、支付状态查询。
- H5 下至少可手动跑：dev-login → 看猪 → 下单 → mock 支付 → 生成分享 → 分享页加入。
- 生产环境不会暴露 mock 支付成功入口。

## 9. 实施顺序

1. 后端 upload 模块 + migration + e2e。
2. 后端 share join/members + migration/e2e。
3. 后端 pay 骨架 + e2e。
4. 前端头像上传。
5. 前端分享页加入与成员展示。
6. 文档同步、build/test、commit。
