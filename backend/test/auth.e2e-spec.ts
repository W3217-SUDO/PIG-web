import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, devLogin, auth, expectOk } from './helpers/app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/dev-login', () => {
    it('开发环境可登录,返 access_token + user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ openid: 'e2e_auth_dev_1' });
      const data = expectOk<{
        user: { id: string; openid: string; role: string };
        access_token: string;
        refresh_token: string;
      }>(res);
      expect(data.access_token).toMatch(/^eyJ/); // JWT
      expect(data.refresh_token).toMatch(/^eyJ/);
      expect(data.user.openid).toBe('e2e_auth_dev_1');
      expect(data.user.id).toMatch(/^[A-Z0-9]{26}$/); // ULID
      expect(data.user.role).toBe('user');
    });

    it('默认 openid (不传) 用 dev_user_001', async () => {
      const { openid } = await devLogin(app, 'dev_user_001');
      expect(openid).toBe('dev_user_001');
    });

    it('再次同 openid → 返同一个用户 (findOrCreate)', async () => {
      const a = await devLogin(app, 'e2e_auth_idempotent');
      const b = await devLogin(app, 'e2e_auth_idempotent');
      expect(a.userId).toBe(b.userId);
    });
  });

  describe('GET /api/auth/me', () => {
    it('带 token → 返回当前用户', async () => {
      const { token, userId } = await devLogin(app);
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(token));
      const data = expectOk<{ id: string }>(res);
      expect(data.id).toBe(userId);
    });

    it('无 token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('错误 token → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('refresh token 可换新 token pair', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ openid: 'e2e_auth_refresh_1' });
      const first = expectOk<{
        user: { id: string };
        access_token: string;
        refresh_token: string;
      }>(login);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: first.refresh_token });
      const next = expectOk<{
        access_token: string;
        refresh_token: string;
        token_type: string;
      }>(res);

      expect(next.access_token).toMatch(/^eyJ/);
      expect(next.refresh_token).toMatch(/^eyJ/);
      expect(next.token_type).toBe('Bearer');

      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(next.access_token));
      const user = expectOk<{ id: string }>(me);
      expect(user.id).toBe(first.user.id);
    });

    it('access token 不能用于 refresh', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ openid: 'e2e_auth_refresh_access_reject' });
      const first = expectOk<{ access_token: string }>(login);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: first.access_token });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logout 后当前 access token 立即失效', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ openid: 'e2e_auth_logout_1' });
      const first = expectOk<{ access_token: string; refresh_token: string }>(login);

      const logout = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set(auth(first.access_token))
        .send({ refresh_token: first.refresh_token });
      expectOk<{ revoked: true }>(logout);

      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(first.access_token));
      expect(me.status).toBe(401);

      const refresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: first.refresh_token });
      expect(refresh.status).toBe(401);
    });
  });
});
