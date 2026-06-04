# Backend Coverage Plan

Last measured: 2026-06-05

Command:

```bash
npm -w backend run test:cov -- --runInBand
```

Current result:

- Test suites: 7 passed
- Tests: 29 passed
- Statement coverage: 22.11%
- Line coverage: 22.50%
- Target before marking TASKS 2.17 complete: >= 40%

Important note:

`test:e2e` covers the auth/order/wallet runtime paths well, but Jest e2e coverage is not currently reliable for `backend/src` coverage accounting because the e2e config is rooted at `backend/test`. Do not mark backend coverage complete based on e2e pass counts alone.

## Completed In This Pass

- `wallet.service.ts`: wallet creation/reuse, overview, pagination, credit/debit and insufficient balance.
- `message.service.ts`: notify success/failure, list, mark one read, mark all read.
- `pig.service.ts`: list, detail, missing detail, feeding/health timeline merge.
- `user.service.ts`: find/create user, admin repair, profile update, missing user.
- `address.service.ts`: list, create default, default switching, update missing, remove/promote next default.

## Remaining Priority Order

1. `order.service.ts`
   - Create order inventory boundaries.
   - Wallet pay transaction boundary.
   - Refund/cancel state machine.

2. `share.service.ts`
   - Invite creation/reuse.
   - Public lookup.
   - Join idempotency.
   - Member visibility guard.

3. `upload.service.ts`
   - Local path/url generation.
   - Asset persistence metadata.
   - Reject unsupported/unsafe input where applicable.

4. Common layer
   - `response-wrap.interceptor.ts`
   - `all-exceptions.filter.ts`
   - `roles.guard.ts`
   - `sentry.ts` no-op and capture boundary.

## Done Criteria

Run:

```bash
npm -w backend run test:cov -- --runInBand
npm -w backend run test:e2e -- --runInBand
```

Only mark `后端单测覆盖率 >= 40%` complete when `test:cov` reports `All files` statements >= 40% and the e2e suite remains green.
