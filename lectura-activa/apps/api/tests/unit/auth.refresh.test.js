import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refreshSession: vi.fn(),
}));

vi.mock('../../src/config/supabase.js', () => ({
  supabaseAuth: { auth: { refreshSession: mocks.refreshSession } },
  supabaseReady: true,
  supabaseAdmin: null,
  supabaseAdminReady: false,
}));

import { authRoutes } from '../../src/modules/auth/auth.routes.js';

async function buildApp() {
  const app = Fastify();
  await app.register(cookie);
  await app.register(authRoutes, {
    prefix: '/api/v1/auth',
    db: { collection: () => ({}) },
  });
  await app.ready();
  return app;
}

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => {
    mocks.refreshSession.mockReset();
  });

  it('renews both HttpOnly cookies using the rotated Supabase session', async () => {
    mocks.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 1800,
        },
      },
      error: null,
    });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: 'sb-refresh-token=old-refresh-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(mocks.refreshSession).toHaveBeenCalledWith({
      refresh_token: 'old-refresh-token',
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sb-access-token=new-access-token'),
        expect.stringContaining('sb-refresh-token=new-refresh-token'),
        expect.stringContaining('HttpOnly'),
      ])
    );
    expect(response.headers['set-cookie'].join(';')).toContain('Max-Age=1800');
    await app.close();
  });

  it('rejects and clears cookies when Supabase invalidates the refresh token', async () => {
    mocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' },
    });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: 'sb-refresh-token=invalid-refresh-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_REFRESH_TOKEN');
    expect(response.headers['set-cookie'].join(';')).toContain('Max-Age=0');
    await app.close();
  });

  it('preserves cookies when Supabase is temporarily unavailable', async () => {
    mocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthRetryableFetchError', status: 0 },
    });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: 'sb-refresh-token=refresh-token' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('AUTH_PROVIDER_UNAVAILABLE');
    expect(response.headers['set-cookie']).toBeUndefined();
    await app.close();
  });
});
