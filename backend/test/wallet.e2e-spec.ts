import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, devLogin, auth, expectOk } from './helpers/app';

describe('Wallet (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    const u = await devLogin(app, 'e2e_wallet_user');
    token = u.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/wallet/me → 首次访问自动建钱包,balance=0', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wallet/me')
      .set(auth(token));
    const data = expectOk<{
      wallet: { balance: string; frozen: string };
      recent: unknown[];
    }>(res);
    expect(data.wallet.balance).toMatch(/^\d+\.\d{2}$/);
    expect(parseFloat(data.wallet.balance)).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.recent)).toBe(true);
  });

  it('POST /api/wallet/topup → 余额加 + 写流水', async () => {
    const before = await request(app.getHttpServer())
      .get('/api/wallet/me')
      .set(auth(token));
    const balBefore = parseFloat(before.body.data.wallet.balance);

    const res = await request(app.getHttpServer())
      .post('/api/wallet/topup')
      .set(auth(token))
      .send({ amount: 100 });
    const data = expectOk<{
      ok: boolean;
      transaction: { direction: string; type: string; amount: string };
    }>(res);
    expect(data.ok).toBe(true);
    expect(data.transaction.direction).toBe('in');
    expect(data.transaction.type).toBe('topup');
    expect(parseFloat(data.transaction.amount)).toBe(100);

    const after = await request(app.getHttpServer())
      .get('/api/wallet/me')
      .set(auth(token));
    const balAfter = parseFloat(after.body.data.wallet.balance);
    expect(balAfter).toBeCloseTo(balBefore + 100, 2);
  });

  it('GET /api/wallet/transactions → 分页 + 含刚才的 topup', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wallet/transactions?page=1&pageSize=20')
      .set(auth(token));
    const data = expectOk<{
      items: Array<{ type: string; direction: string; amount: string }>;
      total: number;
    }>(res);
    expect(data.total).toBeGreaterThan(0);
    expect(data.items.some((t) => t.type === 'topup' && t.direction === 'in')).toBe(
      true,
    );
  });

  it('POST /api/wallet/topup amount=0 → 校验失败 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wallet/topup')
      .set(auth(token))
      .send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it('POST /api/wallet/topup amount 超大 → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wallet/topup')
      .set(auth(token))
      .send({ amount: 9999999 });
    expect(res.status).toBe(400);
  });

  it('无 token → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/wallet/me');
    expect(res.status).toBe(401);
  });
});
