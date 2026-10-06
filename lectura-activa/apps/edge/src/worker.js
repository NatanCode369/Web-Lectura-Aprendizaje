/**
 * Worker proxy de Lectura Activa.
 *
 * Recibe lo que llegue a  https://TU-DOMINIO/api/*  y lo reenvía a la API
 * (Cloud Run). Por eso la web y la API comparten origen y no hay CORS.
 *
 * Qué hace:
 *   1. Solo acepta rutas /api/...  (todo lo demás: 404)
 *   2. Borra cualquier x-origin-secret / x-client-ip que mande el cliente
 *   3. Agrega x-origin-secret (el secreto) y x-client-ip (IP real del usuario)
 *   4. Reenvía método, headers (incluido Authorization) y body sin tocarlos
 *
 * Qué NO hace (a propósito):
 *   - NO valida el JWT: eso lo hace la API (auth.js). Así no hay forma de
 *     entrar a la API "diciendo" quién eres con un header.
 *   - NO toca CORS: la API responde sus propios headers.
 *
 * Variables (wrangler.toml / secretos):
 *   ORIGIN_URL            URL base de la API, sin "/" final
 *   ORIGIN_SHARED_SECRET  secreto compartido con la API (wrangler secret put)
 */

const json = (status, code, message) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export default {
  async fetch(request, env) {
    if (!env.ORIGIN_URL || !env.ORIGIN_SHARED_SECRET) {
      return json(500, 'EDGE_NOT_CONFIGURED', 'El Worker no está configurado.');
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return json(404, 'NOT_FOUND', 'Ruta no encontrada.');
    }

    const destino = new URL(url.pathname + url.search, env.ORIGIN_URL);
    const proxied = new Request(destino, request);

    // Lo que mande el cliente con estos nombres NUNCA se reenvía.
    proxied.headers.delete('x-origin-secret');
    proxied.headers.delete('x-client-ip');
    proxied.headers.set('x-origin-secret', env.ORIGIN_SHARED_SECRET);
    proxied.headers.set('x-client-ip', request.headers.get('cf-connecting-ip') ?? '');

    try {
      return await fetch(proxied);
    } catch {
      return json(502, 'ORIGIN_UNREACHABLE', 'No se pudo contactar con la API.');
    }
  },
};
