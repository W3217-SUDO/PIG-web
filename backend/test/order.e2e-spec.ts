import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, devLogin, auth, expectOk } from './helpers/app';

describe('Order (e2e, 端到端下单全流程)', () => {
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

  // ============== 创建订单 ==============

  describe('POST /api/orders', () => {
    it('创建订单(status=pending)', async () => {
      if (!listedPigId) return;
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

    it('不存在的 pigId → 404/400', async () => {
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

    it('带备注 + 校验 remark 入库', async () => {
      if (!listedPigId) return;
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1, remark: 'e2e 备注测试' });
      const order = expectOk<{ id: string; remark: string }>(res);
      expect(order.remark).toBe('e2e 备注测试');
    });
  });

  // ============== mock 支付 ==============

  describe('POST /api/orders/:id/mock-paid (端到端核心)', () => {
    it('下单 → 支付 → 订单变 paid + pig.sold_shares+=', async () => {
      if (!listedPigId) return;

      const before = await request(app.getHttpServer()).get(
        `/api/pigs/${listedPigId}`,
      );
      const soldBefore = before.body.data.soldShares as number;

      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      const order = expectOk<{ id: string; status: string }>(orderRes);
      expect(order.status).toBe('pending');

      const payRes = await request(app.getHttpServer())
        .post(`/api/orders/${order.id}/mock-paid`)
        .set(auth(token));
      const paid = expectOk<{
        order: { status: string; paidAt: string | null; payMethod: string };
        payment: { status: string; transactionId: string };
      }>(payRes);
      expect(paid.order.status).toBe('paid');
      expect(paid.order.paidAt).toBeTruthy();
      expect(paid.order.payMethod).toBe('mock');
      expect(paid.payment.status).toBe('success');
      expect(paid.payment.transactionId).toMatch(/^mock_/);

      const after = await request(app.getHttpServer()).get(
        `/api/pigs/${listedPigId}`,
      );
      const soldAfter = after.body.data.soldShares as number;
      expect(soldAfter).toBe(soldBefore + 1);
    });
  });

  // ============== 钱包支付 ==============

  describe('POST /api/orders/:id/wallet-pay (钱包余额支付)', () => {
    let walletUser: { token: string; userId: string };
    let walletOrderId: string;

    beforeAll(async () => {
      // 独立用户避免污染 wallet 余额
      walletUser = await devLogin(app, 'e2e_order_wallet_user');
      // 充值 99999(覆盖任意份额价格)
      await request(app.getHttpServer())
        .post('/api/wallet/topup')
        .set(auth(walletUser.token))
        .send({ amount: 99999 });
    });

    it('钱包足额 → 扣款成功 + order.payMethod=wallet', async () => {
      if (!listedPigId) return;
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(walletUser.token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      const order = expectOk<{ id: string; totalPrice: string }>(orderRes);
      walletOrderId = order.id;
      const totalPrice = parseFloat(order.totalPrice);

      // 取支付前钱包余额
      const balBeforeRes = await request(app.getHttpServer())
        .get('/api/wallet/me')
        .set(auth(walletUser.token));
      const balBefore = parseFloat(balBeforeRes.body.data.wallet.balance);

      const payRes = await request(app.getHttpServer())
        .post(`/api/orders/${walletOrderId}/wallet-pay`)
        .set(auth(walletUser.token));
      const paid = expectOk<{
        order: { status: string; payMethod: string };
        payment: { channel: string; status: string };
      }>(payRes);
      expect(paid.order.status).toBe('paid');
      expect(paid.order.payMethod).toBe('wallet');
      expect(paid.payment.channel).toBe('wallet');
      expect(paid.payment.status).toBe('success');

      // 钱包余额扣减
      const balAfterRes = await request(app.getHttpServer())
        .get('/api/wallet/me')
        .set(auth(walletUser.token));
      const balAfter = parseFloat(balAfterRes.body.data.wallet.balance);
      expect(balAfter).toBeCloseTo(balBefore - totalPrice, 2);
    });

    it('钱包不足 → 400', async () => {
      if (!listedPigId) return;
      // 新建零余额用户
      const poor = await devLogin(app, 'e2e_order_poor_user');

      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(poor.token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      const order = expectOk<{ id: string }>(orderRes);

      const payRes = await request(app.getHttpServer())
        .post(`/api/orders/${order.id}/wallet-pay`)
        .set(auth(poor.token));
      expect(payRes.status).toBe(400);
      expect(payRes.body?.message || '').toMatch(/余额不足/);
    });

    it('已支付订单不能再支付 → 400', async () => {
      if (!walletOrderId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${walletOrderId}/wallet-pay`)
        .set(auth(walletUser.token));
      expect(res.status).toBe(400);
    });
  });

  // ============== 退款 ==============

  describe('POST /api/orders/:id/refund-request (申请退款)', () => {
    let refundOrderId: string;

    beforeAll(async () => {
      if (!listedPigId) return;
      // 下单 + 支付
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      refundOrderId = orderRes.body.data.id;
      await request(app.getHttpServer())
        .post(`/api/orders/${refundOrderId}/mock-paid`)
        .set(auth(token));
    });

    it('paid 状态可申请退款 → status=refund_pending', async () => {
      if (!refundOrderId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${refundOrderId}/refund-request`)
        .set(auth(token))
        .send({ reason: '尺寸不合适,想换一头' });
      const order = expectOk<{ status: string; refundReason: string }>(res);
      expect(order.status).toBe('refund_pending');
      expect(order.refundReason).toBe('尺寸不合适,想换一头');
    });

    it('refund_pending 不能再申请 → 400', async () => {
      if (!refundOrderId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${refundOrderId}/refund-request`)
        .set(auth(token))
        .send({ reason: '再申请一次' });
      expect(res.status).toBe(400);
    });

    it('退款原因太短 → 400', async () => {
      if (!listedPigId) return;
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      await request(app.getHttpServer())
        .post(`/api/orders/${orderRes.body.data.id}/mock-paid`)
        .set(auth(token));

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderRes.body.data.id}/refund-request`)
        .set(auth(token))
        .send({ reason: 'x' });
      expect(res.status).toBe(400);
    });
  });

  // ============== 取消 ==============

  describe('POST /api/orders/:id/cancel', () => {
    it('pending 可取消', async () => {
      if (!listedPigId) return;
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      const order = expectOk<{ id: string }>(orderRes);

      const cancelRes = await request(app.getHttpServer())
        .post(`/api/orders/${order.id}/cancel`)
        .set(auth(token));
      const cancelled = expectOk<{ status: string }>(cancelRes);
      expect(cancelled.status).toBe('cancelled');
    });

    it('paid 不可取消 → 400', async () => {
      if (!listedPigId) return;
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      await request(app.getHttpServer())
        .post(`/api/orders/${orderRes.body.data.id}/mock-paid`)
        .set(auth(token));

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderRes.body.data.id}/cancel`)
        .set(auth(token));
      expect(res.status).toBe(400);
    });
  });

  // ============== 列表 + 详情 ==============

  describe('GET /api/orders/me + /:id', () => {
    it('列表 含 paid 与 refund_pending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me?pageSize=50')
        .set(auth(token));
      const data = expectOk<{ items: Array<{ status: string }>; total: number }>(res);
      expect(data.total).toBeGreaterThan(0);
      expect(data.items.some((o) => o.status === 'paid')).toBe(true);
      expect(data.items.some((o) => o.status === 'refund_pending')).toBe(true);
    });

    it('status 筛选 → paid 全为 paid', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/me?status=paid&pageSize=50')
        .set(auth(token));
      const data = expectOk<{ items: Array<{ status: string }> }>(res);
      for (const o of data.items) {
        expect(o.status).toBe('paid');
      }
    });

    it('订单详情 含 pig 与 payments 数组', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/orders/me?status=paid&pageSize=1')
        .set(auth(token));
      const oneId = listRes.body.data.items?.[0]?.id;
      if (!oneId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/orders/${oneId}`)
        .set(auth(token));
      const data = expectOk<{
        id: string;
        pig: { title: string } | null;
        payments: Array<{ channel: string; status: string }>;
      }>(res);
      expect(data.id).toBe(oneId);
      expect(data.pig).toBeTruthy();
      expect(Array.isArray(data.payments)).toBe(true);
      expect(data.payments.length).toBeGreaterThan(0);
    });

    it('别人的订单 → 404', async () => {
      const other = await devLogin(app, 'e2e_order_other_user');
      const listRes = await request(app.getHttpServer())
        .get('/api/orders/me?status=paid&pageSize=1')
        .set(auth(token));
      const myOrderId = listRes.body.data.items?.[0]?.id;
      if (!myOrderId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/orders/${myOrderId}`)
        .set(auth(other.token));
      expect(res.status).toBe(404);
    });
  });

  // ============== 确认收货(状态机:需先 SHIPPED) ==============

  describe('POST /api/orders/:id/confirm-received', () => {
    it('paid 直接确认收货 → 400(必须先发货)', async () => {
      if (!listedPigId) return;
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(token))
        .send({ pigId: listedPigId, sharesCount: 1 });
      await request(app.getHttpServer())
        .post(`/api/orders/${orderRes.body.data.id}/mock-paid`)
        .set(auth(token));

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderRes.body.data.id}/confirm-received`)
        .set(auth(token));
      expect(res.status).toBe(400);
    });
  });
});
