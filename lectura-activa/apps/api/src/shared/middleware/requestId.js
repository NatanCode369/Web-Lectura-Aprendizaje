/**
 * Middleware de requestId.
 *
 * Asigna un UUID v4 a cada request (`req.id`) para poder correlacionar
 * logs y respuestas de error. Fastify ya genera uno por defecto con
 * `genReqId`, pero este middleware asegura que:
 *  - Si el cliente envía `x-request-id`, se respeta (útil para trazar
 *    desde el frontend).
 *  - El id se añade a la respuesta en la cabecera `x-request-id`.
 *  - El logger lo incluye automáticamente.
 */

import { randomUUID } from 'node:crypto';

const HEADER = 'x-request-id';

export async function requestId(req, reply) {
  const incoming = req.headers[HEADER];
  const id = typeof incoming === 'string' && incoming.length > 0
    ? incoming.slice(0, 128)
    : randomUUID();

  req.id = id;
  reply.header(HEADER, id);
}