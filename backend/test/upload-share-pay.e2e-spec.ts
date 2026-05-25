import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { auth, createTestApp, devLogin, expectOk } from './helpers/app';

describe('Upload + Share member + Pay boundary (e2e)', () => {
  let app: INestApplication;
  let host: { token: string; userId: string };
  let guest: { token: string; userId: string };
  let listedPigId: string;

  beforeAll(async () => {
    app = await createTestApp();
    host = await devLogin(app, 'e2e_v1_host');
    guest = await devLogin(app, 'e2e_v1_guest');

    const list = await request(app.getHttpServer()).get('/api/pigs?pageSize=1');
    listedPigId = list.body?.data?.items?.[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPaidOrder(token = host.token) {
    const orderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(token))
      .send({ pigId: listedPigId, sharesCount: 1 });
    const order = expectOk<{ id: string; status: string }>(orderRes);

    const payRes = await request(app.getHttpServer())
      .post(`/api/orders/${order.id}/mock-paid`)
      .set(auth(token));
    expectOk(payRes);
    return order.id;
  }

  it('uploads an authenticated image and returns a public URL', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );

    const res = await request(app.getHttpServer())
      .post('/api/upload/image')
      .set(auth(host.token))
      .attach('file', png1x1, { filename: 'avatar.png', contentType: 'image/png' });

    const data = expectOk<{
      id: string;
      url: string;
      filename: string;
      size: number;
      mimeType: string;
    }>(res);
    expect(data.id).toMatch(/^[A-Z0-9]{26}$/);
    expect(data.url).toContain('/uploads/');
    expect(data.filename).toMatch(/\.png$/);
    expect(data.size).toBeGreaterThan(0);
    expect(data.mimeType).toBe('image/png');
  });

  it('rejects unauthenticated image upload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/upload/image')
      .attach('file', Buffer.from('fake'), { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('lets invitees join a pig share group and lets members view the group', async () => {
    if (!listedPigId) return;
    const orderId = await createPaidOrder();

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/share`)
      .set(auth(host.token));
    const invite = expectOk<{ code: string }>(inviteRes);

    const joinRes = await request(app.getHttpServer())
      .post(`/api/share/${invite.code}/join`)
      .set(auth(guest.token));
    const joined = expectOk<{ joined: boolean; member: { role: string } }>(joinRes);
    expect(joined.joined).toBe(true);
    expect(joined.member.role).toBe('member');

    const membersRes = await request(app.getHttpServer())
      .get(`/api/share/${invite.code}/members`)
      .set(auth(guest.token));
    const members = expectOk<{
      total: number;
      members: Array<{ userId: string; role: string }>;
    }>(membersRes);

    expect(members.total).toBeGreaterThanOrEqual(2);
    expect(members.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: host.userId, role: 'host' }),
        expect.objectContaining({ userId: guest.userId, role: 'member' }),
      ]),
    );
  });

  it('keeps share member join idempotent for the same invitee', async () => {
    if (!listedPigId) return;
    const orderId = await createPaidOrder();
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/share`)
      .set(auth(host.token));
    const invite = expectOk<{ code: string }>(inviteRes);

    const first = await request(app.getHttpServer())
      .post(`/api/share/${invite.code}/join`)
      .set(auth(guest.token));
    const second = await request(app.getHttpServer())
      .post(`/api/share/${invite.code}/join`)
      .set(auth(guest.token));

    const firstData = expectOk<{ member: { id: string } }>(first);
    const secondData = expectOk<{ member: { id: string } }>(second);
    expect(secondData.member.id).toBe(firstData.member.id);
  });

  it('exposes mock-prepay and payment status through the pay module', async () => {
    if (!listedPigId) return;
    const orderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(host.token))
      .send({ pigId: listedPigId, sharesCount: 1 });
    const order = expectOk<{ id: string }>(orderRes);

    const prepayRes = await request(app.getHttpServer())
      .post(`/api/pay/orders/${order.id}/mock-prepay`)
      .set(auth(host.token));
    const paid = expectOk<{
      order: { status: string; payMethod: string };
      payment: { status: string; transactionId: string };
    }>(prepayRes);
    expect(paid.order.status).toBe('paid');
    expect(paid.order.payMethod).toBe('mock');
    expect(paid.payment.status).toBe('success');

    const statusRes = await request(app.getHttpServer())
      .get(`/api/pay/orders/${order.id}/status`)
      .set(auth(host.token));
    const status = expectOk<{
      order: { id: string; status: string };
      latestPayment: { transactionId: string } | null;
    }>(statusRes);
    expect(status.order.id).toBe(order.id);
    expect(status.order.status).toBe('paid');
    expect(status.latestPayment?.transactionId).toBe(paid.payment.transactionId);
  });

  it('keeps wx-pay notify closed until real WeChat Pay is configured', async () => {
    const res = await request(app.getHttpServer()).post('/api/pay/wx-notify').send({});

    expect(res.status).toBe(503);
    expect(res.body?.code).not.toBe(0);
  });
});
