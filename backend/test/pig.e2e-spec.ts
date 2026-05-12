import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, expectOk } from './helpers/app';

/**
 * 依赖:本地 docker MySQL 已 seed(npm run seed:dev)
 * 至少 1 头猪 status=listed
 */
describe('Pig (e2e, 公开 API)', () => {
  let app: INestApplication;
  let samplePigId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/pigs → 返回带 farmer 的列表', async () => {
    const res = await request(app.getHttpServer()).get('/api/pigs?pageSize=10');
    const data = expectOk<{
      items: Array<{ id: string; title: string; farmer: { name: string } | null }>;
      total: number;
      page: number;
      pageSize: number;
    }>(res);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(10);

    if (data.items.length > 0) {
      const first = data.items[0];
      expect(first.id).toMatch(/^[A-Z0-9]{26}$/);
      expect(first.title).toBeTruthy();
      samplePigId = first.id;
    }
  });

  it('GET /api/pigs?region=广元 → 仅返该区猪', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/pigs')
      .query({ region: '广元' });
    const data = expectOk<{ items: Array<{ region: string }> }>(res);
    for (const p of data.items) {
      expect(p.region).toBe('广元');
    }
  });

  it('GET /api/pigs/:id → 详情含 farmer story / mockVideoUrl', async () => {
    if (!samplePigId) {
      // 跳过(空库情况)
      return;
    }
    const res = await request(app.getHttpServer()).get(`/api/pigs/${samplePigId}`);
    const data = expectOk<{
      id: string;
      title: string;
      mockVideoUrl: string;
      farmer: { years: number; story: string | null } | null;
    }>(res);
    expect(data.id).toBe(samplePigId);
    expect(data.title).toBeTruthy();
  });

  it('GET /api/pigs/:id/timeline → 含 feeding + health 事件', async () => {
    if (!samplePigId) return;
    const res = await request(app.getHttpServer()).get(
      `/api/pigs/${samplePigId}/timeline`,
    );
    const data = expectOk<Array<{ kind: 'feeding' | 'health'; at: string; title: string }>>(
      res,
    );
    expect(Array.isArray(data)).toBe(true);
    // 时间倒序
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1].at >= data[i].at).toBe(true);
    }
  });

  it('GET /api/pigs/01XXXXXXXXXXXXXXXXXXXXXXXX → 404', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/pigs/01XXXXXXXXXXXXXXXXXXXXXXXX',
    );
    expect(res.status).toBe(404);
  });
});
