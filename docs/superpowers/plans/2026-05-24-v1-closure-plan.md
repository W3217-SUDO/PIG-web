# V1 Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the first production-facing closure around upload, share membership, and payment boundaries.

**Architecture:** Add small NestJS modules that follow the existing module/controller/service/entity/migration pattern. Keep real WeChat payment out of scope until merchant credentials exist, but add a stable pay boundary now. Update uni-app pages only after backend endpoints compile and pass smoke tests.

**Tech Stack:** NestJS 10, TypeORM, MySQL 8, Express/Multer, uni-app Vue 3, Jest e2e.

---

## File Structure

Backend:
- `backend/src/modules/upload/*`: local image upload endpoint and asset entity.
- `backend/db/migrations/*UploadAndShareMember.ts`: upload asset table and share member table.
- `backend/src/modules/share/*`: join and members endpoints.
- `backend/src/modules/pay/*`: pay module skeleton and order payment status endpoint.
- `backend/src/app.module.ts`: import UploadModule and PayModule.
- `backend/test/upload.e2e-spec.ts`, `backend/test/share.e2e-spec.ts`, `backend/test/pay.e2e-spec.ts`: smoke coverage.

Frontend:
- `frontend/src/pages/my/profile.vue`: avatar upload.
- `frontend/src/pages/share/landing.vue`: join share.
- `frontend/src/pages/my/orders.vue`: members display.

Docs:
- `docs/03-backend/api-status.md`
- `docs/TASKS.md`

## Task 1: Backend upload module

**Files:**
- Create: `backend/src/modules/upload/upload-asset.entity.ts`
- Create: `backend/src/modules/upload/upload.module.ts`
- Create: `backend/src/modules/upload/upload.controller.ts`
- Create: `backend/src/modules/upload/upload.service.ts`
- Create: `backend/db/migrations/<timestamp>-UploadAndShareMember.ts`
- Modify: `backend/src/app.module.ts`

- [ ] Add `UploadAsset` entity with user_id, storage, filename, mimeType, size, path, url.
- [ ] Add `POST /api/upload/image` with JWT auth, file size/type validation, local disk storage.
- [ ] Use `STORAGE_LOCAL_DIR` and `STORAGE_LOCAL_BASE_URL` config.
- [ ] Add migration table.
- [ ] Build backend.

## Task 2: Share membership

**Files:**
- Create: `backend/src/modules/share/share-member.entity.ts`
- Modify: `backend/src/modules/share/share.module.ts`
- Modify: `backend/src/modules/share/share.controller.ts`
- Modify: `backend/src/modules/share/share.service.ts`
- Modify: same migration as Task 1 or a second migration.

- [ ] Add `share_member` table with unique share_id/user_id.
- [ ] Add host/member roles.
- [ ] Implement idempotent `POST /api/share/:code/join`.
- [ ] Implement permission-checked `GET /api/share/:code/members`.
- [ ] Build backend.

## Task 3: Pay boundary module

**Files:**
- Create: `backend/src/modules/pay/pay.module.ts`
- Create: `backend/src/modules/pay/pay.controller.ts`
- Create: `backend/src/modules/pay/pay.service.ts`
- Modify: `backend/src/app.module.ts`

- [ ] Add `GET /api/pay/orders/:orderId/status`.
- [ ] Add `POST /api/pay/orders/:orderId/mock-prepay` for non-production.
- [ ] Add `POST /api/pay/wx-notify` that returns configured failure until WeChat Pay config exists.
- [ ] Build backend.

## Task 4: Frontend closure

**Files:**
- Modify: `frontend/src/pages/my/profile.vue`
- Modify: `frontend/src/pages/share/landing.vue`
- Modify: `frontend/src/pages/my/orders.vue`

- [ ] Use `uni.chooseImage` + `uni.uploadFile` for avatar upload.
- [ ] Add share join CTA on landing page.
- [ ] Add members popup from order card.
- [ ] Build H5 and MP Weixin if dependencies permit.

## Task 5: Tests and docs

**Files:**
- Create/modify backend e2e specs.
- Modify docs.

- [ ] Add smoke tests for upload/share/pay.
- [ ] Run backend build and targeted tests.
- [ ] Update docs and commit.
