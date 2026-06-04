# Backend Coverage Plan

Last measured: 2026-06-05

Command:

```bash
npm -w backend run test:cov -- --runInBand
```

Current result:

- Test suites: 11 passed
- Tests: 55 passed
- Statement coverage: 40.90%
- Line coverage: 41.98%
- Target before marking TASKS 2.17 complete: achieved

Important note:

`test:e2e` covers the auth/order/wallet runtime paths well, but Jest e2e coverage is not currently reliable for `backend/src` coverage accounting because the e2e config is rooted at `backend/test`. Do not mark backend coverage complete based on e2e pass counts alone.

## Completed In This Pass

- `wallet.service.ts`: wallet creation/reuse, overview, pagination, credit/debit and insufficient balance.
- `message.service.ts`: notify success/failure, list, mark one read, mark all read.
- `pig.service.ts`: list, detail, missing detail, feeding/health timeline merge.
- `user.service.ts`: find/create user, admin repair, profile update, missing user.
- `address.service.ts`: list, create default, default switching, update missing, remove/promote next default.
- `order.service.ts`: create/list/detail, cancel, wallet pay, refund, shipping, receipt, mock-pay production guard.
- `share.service.ts`: invite reuse/create, public lookup, join idempotency, member visibility guard.
- `upload.service.ts`: local path/url generation, asset metadata, invalid file/type/size guards.
- `farmer.service.ts`: detail counts, missing farmer, listed/all pig listing.

## Remaining Useful Coverage

1. Common layer
   - `response-wrap.interceptor.ts`
   - `all-exceptions.filter.ts`
   - `roles.guard.ts`
   - `sentry.ts` no-op and capture boundary.

2. Larger deferred services
   - `foster.service.ts`
   - `pay.service.ts` after real merchant credentials are available.

## Done Criteria

Run:

```bash
npm -w backend run test:cov -- --runInBand
npm -w backend run test:e2e -- --runInBand
```

`后端单测覆盖率 >= 40%` is complete as of 2026-06-05. Keep the same commands green before release/tagging.
