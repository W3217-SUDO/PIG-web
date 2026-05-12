<template>
  <view class="page">
    <view class="container">
      <text class="title">隐私政策</text>
      <text class="meta">最后更新:2026-05-12 · 适用版本:v1.0.0</text>

      <text class="lead">
        「私人订猪」(以下简称「我们」)非常重视用户的个人隐私和数据安全。本政策说明我们如何收集、使用、存储和保护你的信息。
      </text>

      <text class="h2">1. 我们收集的信息</text>

      <text class="h3">1.1 你主动提供的</text>
      <text class="p">
        · 注册信息:微信 openid(用于登录)、昵称、头像、手机号(选填)
        · 收货地址:省市区、详细地址、收件人、联系电话
        · 实名信息(选填):仅当你选择实名时使用,用于身份验证
      </text>

      <text class="h3">1.2 服务过程中自动产生的</text>
      <text class="p">
        · 订单记录:认领的猪、份数、金额、支付状态
        · 钱包流水:余额变动记录
        · 设备信息:设备型号、操作系统、网络环境(用于 bug 排查)
      </text>

      <text class="h2">2. 我们如何使用</text>
      <text class="p">
        · 完成认领、支付、配送等核心业务流程
        · 推送订单状态变化、猪的健康记录(站内消息)
        · 用于客服沟通和争议处理
        · 用于改进产品功能(脱敏后的聚合数据)
      </text>
      <text class="p strong">
        我们不会:出售、出租或与第三方共享你的个人信息(法律强制要求除外)。
      </text>

      <text class="h2">3. 我们如何保护</text>
      <text class="p">
        · 所有传输使用 HTTPS 加密
        · 密码 / 凭据采用业界标准加密存储
        · 服务器位于腾讯云,通过 ICP 备案
        · 定期审计 + 漏洞扫描
        · 严格的内部访问权限管理
      </text>

      <text class="h2">4. 你的权利</text>
      <text class="p">
        · 查询、更正、删除你的个人信息 → 「我的 → 个人资料」
        · 注销账户 → 联系客服(下方邮箱)
        · 撤回授权 → 微信「我」→「设置」→「隐私」→ 撤销小程序授权
      </text>

      <text class="h2">5. cookie 与本地存储</text>
      <text class="p">
        我们仅使用必要的本地存储(登录凭据、设备 ID),不使用第三方追踪 cookie。
      </text>

      <text class="h2">6. 未成年人保护</text>
      <text class="p">
        本产品面向 18 岁以上成年人。如果你是监护人,发现孩子未经同意提供了个人信息,请联系我们删除。
      </text>

      <text class="h2">7. 政策变更</text>
      <text class="p">
        本政策更新会在 App / 小程序内显著告知,继续使用即视为同意。
      </text>

      <text class="h2">8. 联系我们</text>
      <text class="p">
        · 邮箱:privacy@rockingwei.online
        · 公众号:私人订猪
        · 工作时间:工作日 09:00 - 18:00
      </text>

      <view class="footer">
        <text>🐷 「认一头猪 · 过一个年」 — 私 人 订 猪</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 纯静态页,无逻辑
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f3ec;
  padding: 32rpx 0;
}
.container {
  background: #fff;
  margin: 0 24rpx;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.title {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: #1a1a1a;
  text-align: center;
  letter-spacing: 2rpx;
}
.meta {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  text-align: center;
  margin-top: 12rpx;
  margin-bottom: 32rpx;
}
.lead {
  display: block;
  font-size: 26rpx;
  color: #444;
  line-height: 1.85;
  background: #faf6ec;
  padding: 24rpx;
  border-radius: 16rpx;
  border-left: 6rpx solid #c0392b;
  margin-bottom: 32rpx;
}
.h2 {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #c0392b;
  margin: 36rpx 0 16rpx;
  letter-spacing: 1rpx;
}
.h3 {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin: 16rpx 0 8rpx;
}
.p {
  display: block;
  font-size: 26rpx;
  color: #444;
  line-height: 1.85;
  white-space: pre-line;
}
.p.strong {
  background: rgba(192, 57, 43, 0.07);
  border-left: 6rpx solid #c0392b;
  padding: 16rpx 20rpx;
  border-radius: 0 12rpx 12rpx 0;
  margin-top: 12rpx;
  color: #5a2818;
  font-weight: 600;
}
.footer {
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 2rpx dashed #f0e8d4;
  text-align: center;
}
.footer text {
  font-size: 22rpx;
  color: #aaa;
  letter-spacing: 2rpx;
}
</style>
