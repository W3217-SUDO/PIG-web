import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, devLogin, auth, expectOk } from './helpers/app';

describe('Order (e2e, 端到端下单流程)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let listedPigId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const u = await devLogin(app, 'e2e_order_user');
    token = u.token;
    userId = u.userId;

    // 拿一个 listed 猪做下单(依赖 seed)
    const list = await request(app.getHttpServer()).get('/api/pigs?pageSize=1');
    listedPigId = list.body?.data?.items?.[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/orders', () => {
    it('创建订单(status=pending)', async () => {
      if (!listedPigId) return; // 空库跳过

      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      const order = expectOk<{
        id: string;
        userId: string;
        pigId: string;
        sharesCount: number;
        status: string;
        totalPrice: string;
      }>(res);
      expect(order.userId).toBe(userId);
      expect(order.pigId).toBe(listedPigId);
      expect(order.sharesCount).toBe(1);
      expect(order.status).toBe('pending');
      expect(parseFloat(order.totalPrice)).toBeGreaterThan(0);
    });

    it('无 token → 401', async () => {
      if (!listedPigId) return;
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ pigId: listedPigId, sharesCount: 1 });
      expect(res.status).toBe(401);
    });

    it('不存在的 pigId → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: '01XXXXXXXXXXXXXXXXXXXXXXXX', sharesCount: 1 });
      expect(res.body?.code).not.toBe(0);
      expect([404, 400]).toContain(res.status);
    });

    it('sharesCount 超过剩余 → 400', async () => {
      if (!listedPigId) return;
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 9999 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/orders/:id/mock-paid (端到端核心)', () => {
    it('下单 → 支付 → 订单变 paid + pig.sold_shares+=', async () => {
      if (!listedPigId) return;

      // 1) 取下单前 sold_shares
      const before = await request(app.getHttpServer()).get(
        `/api/pigs/${listedPigId}`,
      );
      const soldBefore = before.body.data.soldShares as number;

      // 2) 下单
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      const order = expectOk<{ id: string; status: string }>(orderRes);
      expect(order.status).toBe('pending');

      // 3) mock-paid
      const payRes = await request(app.getHttpServer())
        .post(`/api/orders/${order.id}/mock-paid`)
        .set(auth(token));
      const paid = expectOk<{
        order: { status: string; paidAt: string | null };
        payment: { status: string; transactionId: string };
      }>(payRes);
      expect(paid.order.status).toBe('paid');
      expect(paid.order.paidAt).toBeTruthy();
      expect(paid.payment.status).toBe('success');
      expect(paid.payment.transactionId).toMatch(/^mock_/);

      // 4) 验 pig.sold_shares 增加
      const after = await request(app.getHttpServer()).get(`/api/pigs/${listedPigId}`);
      const soldAfter = after.body.data.soldShares as number;
      expect(soldAfter).toBe(soldBefore + 1);
    });
  });

  describe('GET /api/orders/me', () => {
    it('刚下单的应该在列表里', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me?pageSize=20')
        .set(auth(token));
      const data = expectOk<{ items: Array<{ status: string }>; total: number }>(res);
      expect(data.total).toBeGreaterThan(0);
      // 至少有一笔 paid (从上面 mock-paid 来的)
      expect(data.items.some((o) => o.status === 'paid')).toBe(true);
    });

    it('支持 status 筛选', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me?status=paid&pageSize=20')
        .set(auth(token));
      const data = expectOk<{ items: Array<{ status: string }> }>(res);
      for (const o of data.items) {
        expect(o.status).toBe('paid');
      }
    });
  });
});
