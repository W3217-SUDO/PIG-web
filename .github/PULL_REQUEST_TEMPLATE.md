<!-- 用一两句话说明这个 PR 干了什么 -->

## 变更类型

- [ ] ✨ feat — 新功能
- [ ] 🐛 fix — bug 修复
- [ ] ♻️ refactor — 重构
- [ ] ⚡ perf — 性能
- [ ] 📝 docs — 文档
- [ ] 🎨 style — 格式
- [ ] ✅ test — 测试
- [ ] 🔧 chore — 杂项
- [ ] 🔨 ci — CI/CD

## 改动详情

<!--
- 改了什么(列表)
- 为什么这么改(背景)
- 用了哪些方案,为什么选这个
-->

## 关联 Issue

<!-- Closes #123 / Refs #456 -->

## 测试

- [ ] 本地 `npm run lint` 通过
- [ ] 本地 `npm -w backend run test` 通过
- [ ] 真机/小程序模拟器测过主流程
- [ ] 加了关键路径的单测
- [ ] (如改了 DB)生成了迁移文件并本地跑通

## 文档 / API 契约

- [ ] 改了 API → 更新 `docs/03-backend/api-spec.md`
- [ ] 改了 DB → 更新 `docs/03-backend/database.md`
- [ ] 改了配置 → 更新 `.env.example` + `docs/03-backend/config.md`
- [ ] 改了模块 → 更新 `docs/03-backend/modules.md`

## 安全 / 风险

- [ ] 没引入新依赖,或引入的依赖经过审核(license / 维护状态)
- [ ] 没 hard-code 密钥
- [ ] 没在日志打敏感字段(密码 / session_key / 身份证)
- [ ] 改了支付 / 钱包 / 鉴权 → 已请 owner 二次 review

## 部署影响

- [ ] 无影响(纯前端文案)
- [ ] 需要重启服务
- [ ] 需要跑数据库迁移
- [ ] 需要更新服务器 `.env.production`
- [ ] 需要清缓存

## 截图 / 录屏(UI 改动必填)

<!-- 拖图进来,或用 https://cloudconvert.com/ 转 mp4 -->
