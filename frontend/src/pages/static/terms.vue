<template>
  <view class="page">
    <view class="container">
      <text class="title">用户协议</text>
      <text class="meta">最后更新:2026-05-12 · 适用版本:v1.0.0</text>

      <text class="lead">
        欢迎使用「私人订猪」(以下简称「本平台」)。请认真阅读以下协议;**点击「同意」或继续使用即视为接受本协议**。
      </text>

      <text class="h2">1. 服务内容</text>
      <text class="p">
        本平台提供的核心服务是「**代养土猪**」:你在平台上认领一头猪仔,平台撮合川北山区的散养农户代你养 10-12 个月,腊月出栏后整猪 / 分割肉运至你提供的收货地址。

**重要:本平台不是卖肉商家。** 你支付的费用包括猪仔款、代养费、餐食费、运输费(可选保险费),平台按月分账给农户和服务方。
      </text>

      <text class="h2">2. 用户资格</text>
      <text class="p">
        · 你必须是年满 18 岁的中国大陆居民(港澳台暂未开通)
        · 提供真实有效的微信账号 / 收货信息
        · 不得为他人虚假代领或转售
      </text>

      <text class="h2">3. 认领与支付</text>
      <text class="p">
        · 你下单后,该头猪在订单状态变为「已支付」时归你认领
        · 每头猪可拆为多份(2-10 份不等),支持「拼猪」邀请家人共同认领
        · 支付方式:微信支付 / 钱包余额(开发期含 mock 支付通道,不影响真实账)
        · 支付失败或取消的订单 24 小时后自动释放份额
      </text>

      <text class="h2">4. 关于「拼猪」</text>
      <text class="p strong">
        💡 关于钱和肉:每位拼猪人 AA 多少、最后怎么分肉、谁来取猪——**这些都你们自家商量**。
平台只负责把猪养好、把肉送到主认领人手里。**平台不参与、不抽成、不仲裁**。
      </text>

      <text class="h2">5. 平台义务</text>
      <text class="p">
        · 保证猪的喂养过程符合「无激素 / 无催肥剂 / 山区散养」的承诺
        · 提供 24h 直播 + 每日喂养打卡 + 健康档案
        · 出栏前 7 天通知收货,出栏后冷链配送
        · 如出现猪病亡 / 误伤 / 农户违约,提供保险理赔或同品种替换
      </text>

      <text class="h2">6. 用户义务</text>
      <text class="p">
        · 提供真实有效的收货地址和联系方式
        · 收货后 24 小时内验收(冷链产品保鲜窗口短)
        · 不得对外宣称本平台肉品为"卖给你",造成第三方误解
        · 不得通过本平台进行二次销售
      </text>

      <text class="h2">7. 退款与争议</text>
      <text class="p">
        · 未支付订单:可随时取消,无费用
        · 已支付 + 未到出栏(认养中):支持退款,扣除已发生的代养费 + 5% 服务费
        · 已出栏 + 配送中:仅在猪有重大问题(明显病征 / 死亡)时全额退款
        · 配送完成:不再支持退款,品质问题走"售后"流程
        · 争议优先与客服协商;无法解决时按《消费者权益保护法》处理
      </text>

      <text class="h2">8. 知识产权</text>
      <text class="p">
        · 本平台的 UI / Logo / 文案 / 视频 受《著作权法》保护
        · 用户上传的照片 / 评论自动授权平台用于产品展示(非商业)
      </text>

      <text class="h2">9. 免责</text>
      <text class="p">
        · 因不可抗力(自然灾害 / 政策变化 / 疫病)无法履约时,平台不承担违约责任,但承诺退款或同品种替换
        · 因用户提供错误地址 / 拒收造成的损失,由用户自行承担
      </text>

      <text class="h2">10. 协议变更</text>
      <text class="p">
        本协议可能根据法律和业务需要更新,我们会通过站内消息提前 7 天告知。继续使用即视为接受新版协议。
      </text>

      <text class="h2">11. 联系</text>
      <text class="p">
        · 客服邮箱:hello@rockingwei.online
        · 投诉与建议:complaint@rockingwei.online
        · 工作时间:工作日 09:00 - 18:00
      </text>

      <view class="footer">
        <text>🏮 「认一头猪 · 过一个年」 — 私 人 订 猪</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 纯静态页
</script>

<style>
.page { min-height: 100vh; background: #f5f3ec; padding: 32rpx 0; }
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
.footer text { font-size: 22rpx; color: #aaa; letter-spacing: 2rpx; }
</style>
