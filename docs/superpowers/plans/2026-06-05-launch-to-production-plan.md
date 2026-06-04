# PIG Launch To Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push the PIG monorepo from current `dev` state to a production-ready MVP that can be deployed to `https://www.rockingwei.online` and submitted as a WeChat Mini Program.

**Architecture:** Keep one monorepo with `backend` as NestJS API and `frontend` as uni-app client for H5 / WeChat Mini Program / APP. Production traffic uses nginx TLS termination on `www.rockingwei.online`, reverse-proxying `/api` to PM2-managed NestJS and serving H5 static assets from nginx.

**Tech Stack:** NestJS 10, TypeORM, MySQL 8, Redis 7, uni-app Vue 3, Pinia, nginx, PM2, Docker local dependencies, GitHub `dev` branch.

---

## File Structure

- `frontend/src/pages/index/index.vue`: replace remaining homepage placeholder taps with real navigation/actions.
- `frontend/src/pages/my/index.vue`: replace help placeholder with a real static page or contact action.
- `frontend/src/pages/order/confirm.vue`: production payment boundary; prevent mock-pay from appearing in production builds.
- `frontend/src/utils/request.ts`: keep token refresh and API base behavior stable for H5 and Mini Program.
- `backend/package.json`: stable build/dev scripts already fixed; keep build cache cleanup.
- `backend/test/upload-share-pay.e2e-spec.ts`: keep E2E fixture cleanup to avoid polluting public pig list.
- `infra/deploy/backend.sh`: production backend deploy path.
- `infra/deploy/h5.sh`: production H5 deploy path.
- `scripts/smoke-prod.sh`: production smoke checks after deploy.
- `docs/TASKS.md`: update launch checklist as work completes.

---

### Task 1: Remove Homepage Placeholder Actions

**Files:**
- Modify: `frontend/src/pages/index/index.vue`

- [ ] **Step 1: Find all placeholders**

Run:

```bash
rg -n "todo\\(" frontend/src/pages/index/index.vue
```

Expected: list all remaining homepage placeholder taps.

- [ ] **Step 2: Replace top hero/about actions**

Replace these actions:

```vue
<text class="hero-brand" @tap="goAbout">私 人 订 猪</text>
<view class="countdown" @tap="goAbout">
<text class="stp-r" @tap="goAbout">详情 ›</text>
<view class="value-card v1" @tap="goAbout">
<view class="value-card v2" @tap="goAbout">
<view class="value-card v3" @tap="goAbout">
```

- [ ] **Step 3: Replace live/order/share actions**

Use existing data helpers where possible:

```ts
function goFirstPig() {
  const first = list.value[0];
  if (!first) {
    uni.showToast({ title: '暂无可认养猪只', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/order/confirm?pigId=${first.id}` });
}

function goFirstLive() {
  const first = list.value[0];
  if (!first) {
    uni.showToast({ title: '暂无直播猪只', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/live/index?pigId=${first.id}` });
}

function goSharePig() {
  goFirstPig();
}
```

- [ ] **Step 4: Verify no homepage `todo()` remains**

Run:

```bash
rg -n "todo\\(" frontend/src/pages/index/index.vue
```

Expected: no output.

- [ ] **Step 5: Build frontend**

Run:

```bash
npm -w frontend run build:h5
```

Expected: `DONE Build complete.`

---

### Task 2: Hide Mock Payment In Production UI

**Files:**
- Modify: `frontend/src/pages/order/confirm.vue`
- Test: manual H5 build and production env build

- [ ] **Step 1: Add production flag**

Add:

```ts
const isProd = (import.meta as any).env?.MODE === 'production';
```

- [ ] **Step 2: Filter payment methods**

Replace payment method list with:

```ts
const payMethods = computed(() => {
  const all: Array<{ value: PayMethod; label: string; sub: string }> = [
    { value: 'wallet', label: '钱包余额', sub: '余额充足时推荐' },
    { value: 'wxpay', label: '微信支付', sub: isProd ? '提交后拉起微信支付' : '开发期暂走 mock 支付' },
    { value: 'mock', label: '开发 mock', sub: '不真实扣钱' },
  ];
  return isProd ? all.filter((item) => item.value !== 'mock') : all;
});
```

- [ ] **Step 3: Prevent production mock calls**

In submit logic, only call `/mock-paid` when `!isProd`. If `isProd && payMethod.value === 'wxpay'` and real WeChat Pay is not configured, show:

```ts
uni.showModal({
  title: '支付暂未开放',
  content: '当前版本先开放认养登记,微信支付开通后会通知您补款。',
  showCancel: false,
});
```

- [ ] **Step 4: Build frontend**

Run:

```bash
npm -w frontend run build:h5
```

Expected: success.

---

### Task 3: Production Deploy Smoke

**Files:**
- Use: `infra/deploy/backend.sh`
- Use: `infra/deploy/h5.sh`
- Use: `scripts/smoke-prod.sh`

- [ ] **Step 1: Build locally**

Run:

```bash
npm -w backend run build
npm -w frontend run build:h5
```

Expected: backend `dist/main.js` exists and frontend H5 build succeeds.

- [ ] **Step 2: Deploy backend**

Run:

```bash
bash infra/deploy/backend.sh
```

Expected: PM2 process online and `/api/health` returns `db: ok`, `redis: ok`.

- [ ] **Step 3: Deploy H5**

Run:

```bash
bash infra/deploy/h5.sh
```

Expected: `https://www.rockingwei.online/` serves latest H5.

- [ ] **Step 4: Smoke production**

Run:

```bash
bash scripts/smoke-prod.sh
```

Expected: API health, pig list, homepage status all pass.

---

### Task 4: Mini Program Release Gate

**Files:**
- Verify: `frontend/src/manifest.json`
- Update: `docs/TASKS.md`

- [ ] **Step 1: Confirm WeChat domain config**

WeChat Mini Program backend should contain:

```text
request:      https://www.rockingwei.online
uploadFile:   https://www.rockingwei.online
downloadFile: https://www.rockingwei.online
socket:       wss://www.rockingwei.online
DNS prefetch: www.rockingwei.online
preconnect:   https://www.rockingwei.online
```

- [ ] **Step 2: Build Mini Program**

Run:

```bash
npm -w frontend run build:mp-weixin
```

Expected: `frontend/dist/build/mp-weixin` generated.

- [ ] **Step 3: Open WeChat Developer Tools**

Import:

```text
frontend/dist/build/mp-weixin
```

Expected: compiles without domain errors and login uses `/api/auth/wx-login`.

---

### Task 5: Final Launch Checklist

**Files:**
- Modify: `docs/TASKS.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update launch state**

Record:

```markdown
- H5 production deployed
- Backend production deployed
- Mini Program package generated
- Known deferred items: real WeChat Pay, real live stream provider
```

- [ ] **Step 2: Commit**

Run:

```bash
git add frontend/src/pages/index/index.vue frontend/src/pages/order/confirm.vue docs/TASKS.md CHANGELOG.md
git commit -m "feat(launch): close MVP user flow for production release"
git push origin dev
```

Expected: push succeeds.

---

## Self-Review

- Spec coverage: homepage placeholders, production mock boundary, deploy, smoke test, mini program gate.
- Placeholder scan: no `TBD`; deferred items are explicitly named as real WeChat Pay and live provider.
- Type consistency: `PayMethod` remains `wallet | wxpay | mock`; `isProd` only filters UI and blocks mock calls.
