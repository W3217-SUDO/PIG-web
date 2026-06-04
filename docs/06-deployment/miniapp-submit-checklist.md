# 微信小程序提审清单

更新时间：2026-06-05

## 当前结论

- 小程序 AppID：`wx7aaf3180b690e871`
- 后端 API：`https://www.rockingwei.online/api`
- 构建产物：`frontend/dist/build/mp-weixin`
- 生产包已启用合法域名校验：`project.config.json -> setting.urlCheck = true`
- 生产包已移除开发登录入口：构建产物中不应出现 `/auth/dev-login`、`/foster/auth/dev-login`、`localhost`
- 当前收款边界：正式环境为“认养登记/待确认”模式，钱包自助充值禁用，真实微信支付需商户号和 API v3 配置到位后再开

## 1. 构建前检查

在仓库根目录执行：

```bash
npm -w frontend run type-check
npm -w frontend run build:mp-weixin
npm run audit:miniapp
```

构建成功后检查：

```bash
rg -n "127\\.0\\.0\\.1:3000/api|localhost|/auth/dev-login|/foster/auth/dev-login|/wallet/topup|开发环境直接到账|不校验合法域名" frontend/dist/build/mp-weixin -S
```

期望：没有命中。

再检查：

```bash
rg -n "https://www\\.rockingwei\\.online/api" frontend/dist/build/mp-weixin -S
```

期望：能命中 `utils/request.js` 和 `utils/fosterRequest.js`。

## 2. 微信后台配置

进入微信公众平台小程序后台：

- 开发管理 -> 开发设置 -> 服务器域名
- `request 合法域名` 增加：`https://www.rockingwei.online`
- 如果后续启用图片上传或直播域名，再补 `uploadFile`、`downloadFile`、`socket` 对应域名
- 确认小程序主体、类目、隐私保护指引已填写
- 确认用户协议、隐私政策页面可访问：小程序内 `pages/static/terms`、`pages/static/privacy`

## 3. 微信开发者工具导入

用微信开发者工具导入：

```text
C:\Users\13533\Desktop\PIG\frontend\dist\build\mp-weixin
```

导入时填写：

- AppID：`wx7aaf3180b690e871`
- 项目名称：`私人订猪`
- 服务类目：按实际资质选择农副产品/食品相关类目

最终提审前不要勾选“本地设置 -> 不校验合法域名”。

## 4. 真机验收

上传前至少完成这些真机动作：

- 微信一键登录成功，后端不返回 `invalid code`、`appid/secret`、`BadGateway`
- 首页猪只列表可加载
- 猪只详情、时间线、直播页可打开
- 认养下单可创建待确认订单
- 我的订单、我的猪、地址管理可打开
- 拼猪分享码页面可打开，分享后同一头猪可被查看
- 代养人登录可进入绑定/注册/工作台流程

## 5. 上传审核

建议版本：

- 版本号：`1.0.0`
- 版本描述：`私人订猪认养平台首版：土猪认养、养殖过程查看、拼猪分享、订单登记`

审核备注建议：

```text
本小程序为农村土猪认养和养殖过程展示平台。用户可查看猪只信息、养殖记录、直播/视频、发起认养登记和拼猪分享。当前版本不直接完成线上支付，认养费用由平台线下确认或后续接入微信支付商户号后开启。
```

## 6. 当前未完成但不阻塞代码包

- 真实微信支付：需要微信支付商户号、API v3 key、证书、回调验签
- 小程序审核发布：需要 Owner 在微信开发者工具中上传并在后台提交
- 食品/农副产品资质：按微信类目审核要求补齐
- APP 打包：同一套 uni-app 代码可继续出 Android/iOS 包，但证书、应用市场账号、隐私合规需单独处理
