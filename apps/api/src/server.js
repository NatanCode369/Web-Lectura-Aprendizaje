/**
 * Servidor Fastify — arranque, plugins y registro de rutas.
 *
 * Exporta:
 *   - buildServer(): construye la instancia (útil para tests).
 *   - start():       conecta la DB y arranca a escuchar.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';

import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { connectDb, closeDb, pingDb } from './shared/db.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { requestId } from './shared/middleware/requestId.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

export async function buildServer({ withDb = true } = {}) {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    disableRequestLogging: false,
    trustProxy: true, // Cloud Run va detrás de proxy
  });

  // ---- Middleware transversal ----
  fastify.addHook('onRequest', requestId);

  // ---- Plugins ----
  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (req) => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiadas peticiones. Intenta de nuevo en unos segundos.',
        requestId: req.id,
      },
    }),
  });

  // ---- Manejo de errores ----
  fastify.setErrorHandler(errorHandler);

  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Ruta no encontrada.',
        requestId: req.id,
      },
    });
  });

  // ---- Conexión a DB (opcional para tests) ----
  let db = null;
  if (withDb) {
    db = await connectDb();
  }

  // ---- Health checks ----
  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.get('/ready', async (req, reply) => {
    const dbOk = withDb ? await pingDb() : true;
    if (!dbOk) {
      return reply.code(503).send({
        error: {
          code: 'DB_NOT_READY',
          message: 'MongoDB no responde.',
          requestId: req.id,
        },
      });
    }
    return { status: 'ready', db: dbOk };
  });

  // ---- Rutas de negocio ----
  await fastify.register(authRoutes, { prefix: '/api/v1/auth', db });
  await fastify.register(usersRoutes, { prefix: '/api/v1', db });

  // ---- Cierre ordenado ----
  fastify.addHook('onClose', async () => {
    await closeDb();
  });

  return fastify;
}

export async function start() {
  const fastify = await buildServer({ withDb: true });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Apagando servidor...');
    try {
      await fastify.close();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error durante el apagado');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`API escuchando en el puerto ${env.PORT}`);
  } catch (err) {
    logger.error({ err }, 'No se pudo arrancar el servidor');
    process.exit(1);
  }
}

// Arranque directo: `node src/server.js`
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  start();
}