# Backend Coverage Plan

Last measured: 2026-06-05

Command:

```bash
npm -w backend run test:cov -- --runInBand
```

Current result:

- Test suites: 2 passed
- Tests: 5 passed
- Statement coverage: 5.78%
- Line coverage: 6.03%
- Target before marking TASKS 2.17 complete: >= 40%

Important note:

`test:e2e` covers the auth/order/wallet runtime paths well, but Jest e2e coverage is not currently reliable for `backend/src` coverage accounting because the e2e config is rooted at `backend/test`. Do not mark backend coverage complete based on e2e pass counts alone.

## Priority Order

1. `wallet.service.ts`
   - `ensureWallet` creates once and reuses existing wallet.
   - `credit` writes balance and `wallet_transaction`.
   - `debit` rejects insufficient balance and writes out transaction when successful.

2. `message.service.ts`
   - `notify` creates user message.
   - `list` paginates user messages.
   - `markReadAll` only updates the current user.

3. `pig.service.ts`
   - List filtering by region/status.
   - Detail with/without farmer.
   - Timeline merge/sort for feeding and health records.

4. `order.service.ts`
   - Create order inventory boundaries.
   - Wallet pay transaction boundary.
   - Refund/cancel state machine.

5. Common layer
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
