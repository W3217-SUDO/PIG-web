# APP 开发指南(iOS / Android)

> 用 uni-app 编译原生 APP,与小程序**共用一份代码**。本文是 APP 端特有事项。

---

## 一、环境准备

| 工具 | 用途 |
|---|---|
| **HBuilderX** App 开发版 | uni-app 官方 IDE,带打包能力 |
| **Android Studio** | 真机调试 + 离线打包 Android |
| **Xcode** | 离线打包 iOS(需 macOS) |
| **DCloud 账号** | 提交云打包 + 申请证书 |

> 想纯命令行 / VSCode 开发也行,但 HBuilderX 真机调试 + 云打包路径最顺。

---

## 二、首次跑起来

```bash
# 仓库根目录
npm install
cd frontend
npm run dev:app
```

然后:
1. 打开 HBuilderX
2. 「文件 → 打开目录」→ 选 `frontend/`
3. 顶部菜单「运行 → 运行到手机或模拟器 → 运行到 Android App 基座」
4. 用手机扫码安装 HBuilder 基座
5. 应用启动,**热重载生效**

---

## 三、与小程序 95% 同代码

绝大部分页面、组件、API 调用、Pinia store 直接复用。唯一需要分别处理的:

### ① 登录

```ts
// utils/login.ts
export async function login() {
  // #ifdef MP-WEIXIN
  const { code } = await uni.login({ provider: 'weixin' });
  return authApi.wxLogin(code);
  // #endif

  // #ifdef APP-PLUS
  // APP 走开放平台微信登录
  const auth = await uni.login({ provider: 'weixin' });
  return authApi.wxAppLogin(auth.code);
  // #endif
}
```

### ② 跳外链

```vue
<!-- 小程序不支持,APP 可以 -->
<!-- #ifdef APP-PLUS -->
<button @tap="openExternalUrl">查看官网</button>
<!-- #endif -->

<!-- 小程序提示复制链接 -->
<!-- #ifdef MP-WEIXIN -->
<button @tap="copyLink">复制链接到浏览器打开</button>
<!-- #endif -->
```

### ③ 文件下载到本地

```ts
// #ifdef APP-PLUS
plus.downloader.createDownload(url, {}, (d, status) => {
  if (status === 200) plus.runtime.openFile(d.filename);
}).start();
// #endif
```

### ④ 推送

小程序用微信模板消息,APP 用 uniPush 2.0:

```ts
// #ifdef APP-PLUS
import { onPushClick } from '@/utils/push';
onPushClick((payload) => {
  uni.navigateTo({ url: payload.target_url });
});
// #endif
```

---

## 四、manifest.json 关键配置

```json
{
  "name": "私人订猪",
  "appid": "__UNI__XXXXXX",
  "description": "认一头猪,过一个年",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": false,

  "app-plus": {
    "usingComponents": true,
    "splashscreen": {
      "alwaysShowBeforeRender": true,
      "waiting": true,
      "autoclose": true,
      "delay": 0
    },
    "modules": {
      "Push": {},
      "Share": {},
      "OAuth": {},
      "Payment": {}
    },
    "distribute": {
      "ios": {
        "dSYMs": false
      },
      "android": {
        "permissions": [
          "<uses-permission android:name=\"android.permission.INTERNET\"/>",
          "<uses-permission android:name=\"android.permission.CAMERA\"/>",
          "<uses-permission android:name=\"android.permission.READ_EXTERNAL_STORAGE\"/>",
          "<uses-permission android:name=\"android.permission.WRITE_EXTERNAL_STORAGE\"/>"
        ],
        "minSdkVersion": 21,
        "targetSdkVersion": 33
      },
      "sdkConfigs": {
        "oauth": {
          "weixin": {
            "appid": "wx_open_appid",
            "UniversalLinks": ""
          }
        },
        "share": {
          "weixin": {
            "appid": "wx_open_appid",
            "UniversalLinks": ""
          }
        },
        "payment": {
          "weixin": {
            "appid": "wx_open_appid",
            "UniversalLinks": ""
          }
        },
        "push": {
          "unipush": { "version": "2" }
        }
      }
    }
  }
}
```

---

## 五、原生能力

| 能力 | uni 内置 / 插件 |
|---|---|
| 摄像头 | `uni.chooseImage` / `uni.chooseVideo` |
| GPS | `uni.getLocation` |
| 蓝牙 | `uni.openBluetoothAdapter` |
| 推送 | uniPush 2.0(`uni.getPushClientId`) |
| 微信登录 | `uni.login({ provider: 'weixin' })` |
| 微信支付 | `uni.requestPayment` |
| 微信分享 | `uni.share({ provider: 'weixin' })` |
| 直播播放器 | uni-ui `<live-player>` |

---

## 六、打包

### 云打包(简单,推荐)

1. HBuilderX:「发行 → 原生App-云打包」
2. 选 Android / iOS
3. 配置:
   - **Android**:用自有证书 / DCloud 公共证书(测试)
   - **iOS**:必须配自有证书 + 描述文件
4. 等待 5–15 分钟
5. 下载 apk / ipa

### 离线打包(高级)

需要 Android Studio / Xcode,流程见 DCloud 官方文档,本项目暂不用。

---

## 七、Android 签名

```bash
# 生成 keystore
keytool -genkeypair -v -keystore pig.keystore -alias pig -keyalg RSA -validity 25000

# 配置到 HBuilderX 云打包,或 build.gradle
```

> ⚠️ keystore 文件 + 密码**必须保管好**,丢了无法更新应用。我们的 keystore 放在私有云盘,密码在 `~/.pig-secrets`。

---

## 八、iOS 签名

需要 Apple Developer 账号($99/年)。

1. App Store Connect 创建应用
2. 生成发布证书(Distribution)
3. 生成 App ID + 描述文件
4. HBuilderX 云打包时上传

详细流程跟着 Apple 官方走,这里略。

---

## 九、推送(uniPush 2.0)

### 客户端

```ts
// App.vue
// #ifdef APP-PLUS
import { onLaunch } from '@dcloudio/uni-app';
onLaunch(() => {
  uni.getPushClientId({
    success: (res) => {
      const cid = res.cid;
      // 上报后端,绑定到当前 user
      api.user.bindPushToken({ cid });
    },
  });

  uni.onPushMessage((msg) => {
    // 在线时收到的消息
    console.log('在线消息', msg);
  });
});
// #endif
```

### 服务端

后端通过 unipush 服务端 API 推送(`message` 模块负责)。

---

## 十、APP 上架

### Android

| 渠道 | 备注 |
|---|---|
| 华为应用市场 | 必须 |
| 小米 | 必须 |
| OPPO | 必须 |
| vivo | 必须 |
| 应用宝(腾讯) | 必须 |
| Google Play | 海外才需要 |

每个渠道需要:
- apk(同一份,统一签名)
- 应用 ICON / 截图(规格各异,在素材库准备)
- 隐私协议 URL
- 软件著作权(可选,大厂应用市场会要)

### iOS

App Store 单一渠道:
- 准备 6.7 寸 + 6.5 寸 + 5.5 寸 截图
- 应用描述 + 关键词
- 隐私协议
- 审核可能比 Android 严,首次审核 1–7 天

---

## 十一、热更新(后续)

uni-app 支持 wgt 资源热更:不通过应用市场,直接推 JS / 静态资源更新。

适用场景:bug fix,小功能。

需要原生层有支持。后续做。

---

## 十二、APP 端 dev / staging / prod 区分

```json
// frontend/env/.env.development
VITE_API_BASE=http://192.168.1.x:3000/api      # 本机 IP,手机才能访问

// frontend/env/.env.staging
VITE_API_BASE=https://staging.rockingwei.online/api

// frontend/env/.env.production
VITE_API_BASE=https://www.rockingwei.online/api
```

**注意**:APP 真机调试时,后端**不能用 `127.0.0.1`**——手机访问不到。改用本机局域网 IP(`192.168.x.x`),并且关掉防火墙。

---

## 十三、APP 与小程序差异 Checklist

写一个新功能,问自己:

- [ ] 这页要在 APP 用吗?(默认都用)
- [ ] 用到 `wx.*` 接口的地方,APP 怎么 fallback?
- [ ] 用到外链跳转,小程序需要 fallback
- [ ] 用到原生能力(GPS/蓝牙/相机),APP 要申请权限
- [ ] 大文件下载,需要原生 API
- [ ] 推送通知,APP 要绑定 cid
- [ ] 微信分享,APP / 小程序 SDK 不同
