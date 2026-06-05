# Owner 上线交接清单

日期：2026-06-05

目标：把 PIG 当前代码包推进到微信小程序提审和灰度上线。本文只记录 Owner 需要在外部平台完成的动作，不把未完成的平台操作标记为代码完成。

## 1. 当前代码侧状态

已完成：

- H5 已可部署到 `https://www.rockingwei.online/`。
- 后端 API 已部署到 `https://www.rockingwei.online/api`。
- 生产健康检查包含 MySQL、Redis、磁盘、PM2、commit、备份状态。
- 服务器侧生产 smoke 已验证过 `25 PASS / 0 FAIL`。
- 小程序产物目录：`frontend/dist/build/mp-weixin`。
- 小程序审计脚本：`npm run audit:miniapp`，检查 AppID、生产 API、dev/mock 入口和包体大小。
- 正式环境不展示 mock 支付；当前版本是“认养登记/待确认”模式。
- 用户协议、隐私政策、关于页面已存在，但真实主体/资质/联系信息仍需 Owner 最终确认。

上线前仍不能由代码自动完成：

- 微信小程序后台提审。
- 微信小程序合法域名配置。
- 真实手机 wx-login 验收。
- 微信支付商户号、API v3 密钥、证书。
- 农副产品/食品相关类目和资质。
- 域名备案接入状态、DNSPod webblock 清除。

## 2. Owner 必填平台

| 平台 | 地址 | 需要做什么 |
| --- | --- | --- |
| 微信公众平台小程序后台 | `https://mp.weixin.qq.com/` | 类目、服务器域名、隐私保护指引、体验版、提审、发布 |
| 微信开发者工具 | 本机应用 | 导入 `frontend/dist/build/mp-weixin`、真机预览、上传体验版 |
| 腾讯云备案/DNSPod/CVM | 腾讯云控制台 | 确认备案接入、域名 webblock、80/443 安全组 |
| 微信支付商户平台 | `https://pay.weixin.qq.com/` | 商户号、API v3 key、证书、回调配置 |

## 3. 微信后台配置

进入微信公众平台：

```text
开发管理 -> 开发设置 -> 服务器域名
```

至少配置：

```text
request 合法域名:      https://www.rockingwei.online
uploadFile 合法域名:   https://www.rockingwei.online
downloadFile 合法域名: https://www.rockingwei.online
```

暂时不使用 WebSocket 时，`socket 合法域名` 可以先不填；后续直播/实时消息若接入 WebSocket，再配置：

```text
socket 合法域名: wss://www.rockingwei.online
```

注意：

- 提审前不要在微信开发者工具中勾选“不校验合法域名”。
- 如果后台新增域名后开发者工具仍提示域名错误，打开“详情 -> 域名信息”刷新项目配置，再重新编译。
- 域名必须公网 HTTPS 可访问。若本地或手机网络访问 `https://www.rockingwei.online/api/health` 失败，先处理备案/DNS/安全组，不要急着提审。

## 4. 微信开发者工具导入

开发者执行或 Owner 在本机执行：

```bash
npm -w frontend run type-check
npm -w frontend run build:mp-weixin
npm run audit:miniapp
```

微信开发者工具导入目录：

```text
C:\Users\13533\Desktop\PIG\frontend\dist\build\mp-weixin
```

导入参数：

```text
AppID: wx7aaf3180b690e871
项目名: 私人订猪
```

上传体验版建议：

```text
版本号: 1.0.0-rc.1
项目备注: 认养登记、拼猪分享、养殖过程展示、订单登记
```

## 5. 真机验收

至少用 2 台真实手机验收：

- Owner 自己的微信。
- 一个非开发者/非管理员的普通微信。

验收动作：

1. 打开体验版。
2. 微信一键登录成功，后端不返回 `invalid code`、`appid/secret`、`BadGateway`。
3. 首页加载猪只列表。
4. 打开猪只详情，查看农户信息、养殖时间线、视频/直播占位。
5. 发起认养登记，生成订单。
6. 查看“我的订单”。
7. 打开拼猪分享页，确认分享码/同一头猪可查看。
8. 打开用户协议、隐私政策、关于页面。
9. 确认正式包里没有“开发测试”“mock 支付”“dev login”等字样。

验收失败时，回传给开发：

```text
手机型号：
微信版本：
网络：Wi-Fi / 4G / 5G
失败页面：
失败动作：
报错截图：
开发者工具 console 报错：
后端时间点：
```

## 6. 提审材料

建议版本说明：

```text
私人订猪认养平台首版：支持土猪认养登记、猪只详情查看、养殖过程展示、拼猪分享、订单登记和个人中心。
```

建议审核备注：

```text
本小程序用于农村土猪认养登记和养殖过程展示。用户可查看猪只信息、养殖记录、视频/直播占位、发起认养登记和拼猪分享。当前版本不直接完成线上支付，认养费用由平台线下确认；微信支付将在商户号和 API v3 配置完成后开启。
```

截图建议：

- 首页猪只列表。
- 猪只详情页。
- 认养登记页。
- 我的订单。
- 拼猪分享页。
- 用户协议/隐私政策。

## 7. 资质和类目

Owner 必须确认：

- 小程序主体是否能经营农副产品/食品相关类目。
- 选择类目是否需要食品经营许可证、农产品销售资质或其他证明。
- 页面文案是否避免承诺疗效、投资收益、夸大食品安全。
- 当前“安全放心、可监控、可溯源”表述是否有对应证据链支撑。

如果类目卡审，可临时调整为“农产品认养信息展示/登记服务”，继续保持不在线收款。

## 8. 微信支付接入前置

真实微信支付未开通前，不要把生产包改成自动拉起支付。

Owner 准备：

```text
WX_PAY_MCH_ID
WX_PAY_API_KEY 或 API v3 Key
微信支付平台证书 / 商户证书
回调地址: https://www.rockingwei.online/api/pay/wx-notify
```

配置完成后再由开发补：

- JSAPI 预支付。
- v3 回调验签和解密。
- 幂等处理。
- 0.01 元真机支付验收。
- 退款流程和对账。

## 9. 域名和备案

上线前从至少两个网络验证：

```text
https://www.rockingwei.online/
https://www.rockingwei.online/api/health
```

如果浏览器打不开或 TLS 握手失败：

1. 腾讯云备案控制台确认 `rockingwei.online` 已备案并接入当前腾讯云服务器。
2. DNSPod 确认 `rockingwei.online` 和 `www.rockingwei.online` 没有 webblock。
3. CVM 安全组确认 80/443 对公网开放。
4. 确认没有误绑定 CDN/WAF/SSL 代理。
5. 用手机 5G 网络重试。

## 10. 发布决策

可以提审的最低条件：

- `npm run audit:miniapp` 通过。
- 服务器侧 `smoke-prod` 通过。
- 微信后台 request 合法域名配置完成。
- 真机登录成功。
- 至少 1 头真实猪可浏览，推荐 5 头。
- 用户协议/隐私政策/关于页面经 Owner 确认。
- 类目和资质准备完成或已选择不会卡审的过渡类目。

可以灰度发布的最低条件：

- 小程序审核通过。
- 至少 1 名普通用户真机可登录并完成认养登记。
- 运营能按 `admin-sop.md` 新增猪只。
- 生产健康告警 cron 正常。
- 当日无未恢复生产故障。

暂不满足正式收款发布：

- 微信支付商户号/API v3/证书未配置。
- 未完成 0.01 元支付闭环。
- 未完成真实退款和对账流程。
