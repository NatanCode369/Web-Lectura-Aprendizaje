import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { registerEdgeGuard, clientKey } from '../../src/shared/edge.js';

const SECRET = 'a'.repeat(32);

async function buildApp({ requireEdge = false, max = 3 } = {}) {
  const app = Fastify();
  registerEdgeGuard(app, { secret: SECRET, requireEdge });
  await app.register(rateLimit, {
    max,
    timeWindow: '1 minute',
    keyGenerator: (req) => clientKey(req, SECRET),
  });
  app.get('/api/v1/ping', async () => ({ ok: true }));
  app.get('/health', async () => ({ status: 'ok' }));
  app.post('/api/v1/auth/internal/validate-domain', async () => ({ ok: true }));
  await app.ready();
  return app;
}

const viaEdge = (ip) => ({ 'x-origin-secret': SECRET, 'x-client-ip': ip });

describe('edge: IP real para el rate limit', () => {
  it('con secreto correcto cuenta cada x-client-ip por separado', async () => {
    const app = await buildApp({ max: 2 });
    for (let i = 0; i < 2; i++) {
      expect((await app.inject({ url: '/api/v1/ping', headers: viaEdge('1.1.1.1') })).statusCode).toBe(200);
    }
    expect((await app.inject({ url: '/api/v1/ping', headers: viaEdge('1.1.1.1') })).statusCode).toBe(429);
    // otro usuario, mismo Worker: no se ve afectado
    expect((await app.inject({ url: '/api/v1/ping', headers: viaEdge('2.2.2.2') })).statusCode).toBe(200);
  });

  it('sin secreto ignora x-client-ip (no se puede esquivar el límite inventando IPs)', async () => {
    const app = await buildApp({ max: 2 });
    const falso = (ip) => ({ 'x-client-ip': ip });
    await app.inject({ url: '/api/v1/ping', headers: falso('3.3.3.3') });
    await app.inject({ url: '/api/v1/ping', headers: falso('4.4.4.4') });
    expect((await app.inject({ url: '/api/v1/ping', headers: falso('5.5.5.5') })).statusCode).toBe(429);
  });

  it('con secreto incorrecto tampoco confía en x-client-ip', async () => {
    const app = await buildApp({ max: 1 });
    const h = (ip) => ({ 'x-origin-secret': 'b'.repeat(32), 'x-client-ip': ip });
    await app.inject({ url: '/api/v1/ping', headers: h('6.6.6.6') });
    expect((await app.inject({ url: '/api/v1/ping', headers: h('7.7.7.7') })).statusCode).toBe(429);
  });
});

describe('edge: bloqueo de acceso directo (REQUIRE_EDGE=true)', () => {
  it('rechaza con 403 lo que no trae el secreto', async () => {
    const app = await buildApp({ requireEdge: true });
    const r = await app.inject({ url: '/api/v1/ping' });
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe('FORBIDDEN');
  });

  it('rechaza secreto incorrecto', async () => {
    const app = await buildApp({ requireEdge: true });
    const r = await app.inject({ url: '/api/v1/ping', headers: { 'x-origin-secret': 'b'.repeat(32) } });
    expect(r.statusCode).toBe(403);
  });

  it('acepta lo que viene del Worker', async () => {
    const app = await buildApp({ requireEdge: true });
    expect((await app.inject({ url: '/api/v1/ping', headers: viaEdge('1.1.1.1') })).statusCode).toBe(200);
  });

  it('deja pasar /health y el hook de Supabase sin secreto', async () => {
    const app = await buildApp({ requireEdge: true });
    expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/internal/validate-domain' })).statusCode).toBe(200);
  });

  it('con REQUIRE_EDGE=false no bloquea nada (desarrollo local)', async () => {
    const app = await buildApp({ requireEdge: false });
    expect((await app.inject({ url: '/api/v1/ping' })).statusCode).toBe(200);
  });
});
