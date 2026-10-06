/**
 * Integración con Cloudflare (Worker proxy en apps/edge).
 *
 * El Worker reenvía cada petición a la API con dos headers propios:
 *   x-origin-secret  → secreto compartido (ORIGIN_SHARED_SECRET)
 *   x-client-ip      → IP real del usuario (CF-Connecting-IP)
 *
 * Este módulo no autentica usuarios: el JWT lo sigue validando auth.js.
 */

import { timingSafeEqual } from 'node:crypto';

const EXENTAS = ['/health', '/ready', '/api/v1/auth/internal/'];

function mismoSecreto(recibido, esperado) {
  if (typeof recibido !== 'string' || !esperado) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function vieneDelEdge(req, secret) {
  return mismoSecreto(req.headers['x-origin-secret'], secret);
}

export function clientKey(req, secret) {
  if (vieneDelEdge(req, secret)) {
    const ip = req.headers['x-client-ip'];
    if (typeof ip === 'string' && ip.trim()) return ip.trim();
  }
  return req.ip;
}

export function registerEdgeGuard(fastify, { secret, requireEdge }) {
  if (!requireEdge) return;

  fastify.addHook('onRequest', async (req, reply) => {
    const ruta = req.url.split('?')[0];
    if (EXENTAS.some((p) => ruta === p || ruta.startsWith(p))) return;
    if (vieneDelEdge(req, secret)) return;

    return reply.code(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'Acceso directo no permitido.',
        requestId: req.id,
      },
    });
  });
}
