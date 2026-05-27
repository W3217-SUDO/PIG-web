# Final Development Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish all locally implementable v1 development gaps and leave external launch dependencies explicitly documented.

**Architecture:** Keep changes narrow and aligned with the existing NestJS module pattern. Complete server-side auth lifecycle behavior, make test scripts verify the actual test suites, and update project task status so code-complete items are separated from Owner-operated launch blockers.

**Tech Stack:** NestJS 10, TypeORM, Redis/ioredis, Jest e2e, uni-app build scripts, Markdown docs.

---

## File Structure

- Modify `backend/test/auth.e2e-spec.ts`: add refresh/logout behavior tests.
- Modify `backend/src/modules/auth/auth.controller.ts`: expose `POST /api/auth/refresh` and `POST /api/auth/logout`.
- Modify `backend/src/modules/auth/auth.service.ts`: verify refresh tokens, issue new token pairs, and revoke JWTs in Redis.
- Modify `backend/src/modules/auth/jwt.strategy.ts`: reject revoked access tokens.
- Modify `backend/package.json`: make `npm -w backend test` run e2e specs when no unit specs exist.
- Modify `docs/TASKS.md`: mark locally completed auth items and record external blockers.

## Task 1: Auth Refresh And Logout

**Files:**
- Test: `backend/test/auth.e2e-spec.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/jwt.strategy.ts`

- [ ] Add e2e tests for refreshing with a refresh token, rejecting access tokens at refresh endpoint, and invalidating access tokens after logout.
- [ ] Run `npm.cmd -w backend run test:e2e -- auth.e2e-spec.ts` and verify the new tests fail because endpoints are missing.
- [ ] Implement `refresh`, `logout`, `isTokenRevoked`, and Redis-backed token revocation.
- [ ] Run the auth e2e test again and verify it passes.

## Task 2: Test Script Alignment

**Files:**
- Modify: `backend/package.json`

- [ ] Change `backend` `test` script from `jest` to `jest --config ./test/jest-e2e.json`.
- [ ] Run `npm.cmd -w backend run test` with local services available.

## Task 3: Docs And Verification

**Files:**
- Modify: `docs/TASKS.md`

- [ ] Update auth task status for refresh/logout/roles.
- [ ] Keep real WeChat payment, app credentials, ICP, and app-store publishing marked as external blockers.
- [ ] Run `npm.cmd -w backend run build`.
- [ ] Run available backend e2e tests if MySQL and Redis are reachable.
- [ ] Run frontend build/type-check if the current Node/toolchain allows it, and record exact blockers if not.

## Self-Review

- Spec coverage: covers local code-complete auth lifecycle, test command alignment, documentation, and verification.
- Placeholder scan: no open placeholders in this plan.
- Type consistency: methods use existing `TokenPair`, `JwtPayload`, and Nest controller/service patterns.
