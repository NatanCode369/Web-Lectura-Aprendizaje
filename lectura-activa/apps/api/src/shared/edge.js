/**
 * Integración con Cloudflare (Worker proxy en apps/edge).
 *
 * El Worker reenvía cada petición a la API con dos headers propios:
 *   x-origin-secret  → secreto compartido (ORIGIN_SHARED_SECRET)
 *   x-client-ip      → IP real del usuario (CF-Connecting-IP)
 *
 * REGLA DE ORO: x-client-ip solo se cree si x-origin-secret coincide.
 * Cualquier cliente puede inventar headers; sin el secreto se ignoran.
 * Este módulo NO autentica usuarios: el JWT lo sigue validando auth.js.
 */

import { timingSafeEqual } from 'node:crypto';

// Rutas que no pasan por el Worker y no deben bloquearse:
//  - health/ready: los consulta Cloud Run
//  - hook de Supabase: lo llama Supabase directo (con su propio secreto)
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

/** Clave para el rate limit: IP real si viene del Worker, si no la de la conexión. */
export function clientKey(req, secret) {
  if (vieneDelEdge(req, secret)) {
    const ip = req.headers['x-client-ip'];
    if (typeof ip === 'string' && ip.trim()) return ip.trim();
  }
  return req.ip;
}

/** Con requireEdge=true responde 403 a todo lo que no pasó por el Worker. */
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
