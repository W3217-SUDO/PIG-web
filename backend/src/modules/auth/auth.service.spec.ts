import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthService } from './auth.service';

describe('AuthService token lifecycle', () => {
  const user = {
    id: '01HTESTUSER000000000000000',
    openid: 'openid_refresh',
    role: 'user',
  } as any;

  function createService(overrides: { verify?: any; redisGet?: any } = {}) {
    const userService = {
      findById: (jest.fn() as any).mockResolvedValue(user),
      findOrCreateByOpenid: jest.fn(),
      findOrCreateAdmin: jest.fn(),
    };
    const jwtService = {
      sign: jest.fn((payload: any) => `signed.${payload.type || 'access'}.${payload.sub}`),
      verify:
        overrides.verify ??
        jest.fn().mockReturnValue({
          sub: user.id,
          openid: user.openid,
          role: user.role,
          type: 'refresh',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };
    const config = {
      get: jest.fn((key: string, fallback?: any) => {
        const values: Record<string, any> = {
          'jwt.accessExpiresIn': '2h',
          'jwt.refreshExpiresIn': '7d',
        };
        return values[key] ?? fallback;
      }),
    };
    const redis = {
      get: overrides.redisGet ?? (jest.fn() as any).mockResolvedValue(null),
      set: (jest.fn() as any).mockResolvedValue('OK'),
    };

    const service = new AuthService(userService as any, jwtService as any, config as any, redis as any);
    return { service, userService, jwtService, redis };
  }

  it('refreshes a valid refresh token into a token pair for the same user', async () => {
    const { service, jwtService } = createService();

    const tokens = await service.refresh('refresh.jwt');

    expect(tokens.access_token).toBe(`signed.access.${user.id}`);
    expect(tokens.refresh_token).toBe(`signed.refresh.${user.id}`);
    expect(jwtService.verify).toHaveBeenCalledWith('refresh.jwt');
  });

  it('rejects an access token at the refresh boundary', async () => {
    const { service } = createService({
      verify: jest.fn().mockReturnValue({
        sub: user.id,
        openid: user.openid,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    await expect(service.refresh('access.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes access and refresh tokens during logout', async () => {
    const { service, redis } = createService();

    await service.logout('access.jwt', 'refresh.jwt');

    expect(redis.set).toHaveBeenCalledWith(
      'jwt:revoked:access.jwt',
      '1',
      'EX',
      expect.any(Number),
    );
    expect(redis.set).toHaveBeenCalledWith(
      'jwt:revoked:refresh.jwt',
      '1',
      'EX',
      expect.any(Number),
    );
  });

  it('reports revoked tokens from Redis', async () => {
    const { service } = createService({ redisGet: (jest.fn() as any).mockResolvedValue('1') });

    await expect(service.assertTokenNotRevoked('any.jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
