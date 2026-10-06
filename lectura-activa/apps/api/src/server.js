import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';         // ← NUEVO
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { connectDb, closeDb, pingDb } from './shared/db.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { requestId } from './shared/middleware/requestId.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { assignmentsRoutes } from './modules/assignments/assignments.routes.js';
import { studentAssignmentsRoutes } from './modules/studentAssignments/studentAssignments.routes.js';
import { attemptsRoutes } from './modules/attempts/attempts.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';

import { buildUserRepository } from './modules/users/user.repository.js';
import { buildReadingRepository } from './modules/readings/reading.repository.js';
import { buildAuditRepository } from './modules/readings/audit.repository.js';
import { buildReadingService } from './modules/readings/reading.service.js';
import { buildAuth } from './shared/auth.js';
import { registerReadingRoutes } from './modules/readings/reading.routes.js';

export async function buildServer({ withDb = true } = {}) {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    trustProxy: true,
  });

  fastify.addHook('onRequest', requestId);

  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(cors, {
    origin: env.CORS_ORIGINS || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  await fastify.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: (req) => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiadas peticiones. Intenta de nuevo en unos segundos.',
        requestId: req.id,
      },
    }),
  });

  // ⭐ NUEVO: multipart para subida de PDFs
  await fastify.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20 MB
      files: 1,
      fields: 5
    }
  });

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

  let db = null;
  if (withDb) {
    db = await connectDb();
  }

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'lectura-activa-api',
    timestamp: new Date().toISOString(),
  }));

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

  await fastify.register(authRoutes, { prefix: '/api/v1/auth', db });
  await fastify.register(usersRoutes, { prefix: '/api/v1/users', db });
  await fastify.register(groupsRoutes, { prefix: '/api/v1/groups', db });
  await fastify.register(assignmentsRoutes, { prefix: '/api/v1/assignments', db });
  await fastify.register(studentAssignmentsRoutes, { prefix: '/api/v1/student-assignments', db });
  await fastify.register(attemptsRoutes, { prefix: '/api/v1/attempts', db });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics', db });

  const userRepository = buildUserRepository();
  const readingRepository = buildReadingRepository();
  const auditRepository = buildAuditRepository();
  const readingService = buildReadingService({ readingRepository, auditRepository });
  const auth = buildAuth({ userRepository });

  await registerReadingRoutes(fastify, { auth, readingService, prefix: '/api/v1/readings' });

  fastify.addHook('onClose', async () => {
    if (withDb) {
      await closeDb();
    }
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
    const port = Number(env.PORT ?? process.env.PORT ?? 3000);
    const host = env.HOST ?? process.env.HOST ?? '0.0.0.0';

    await fastify.listen({ port, host });
    logger.info(`✅ API escuchando en http://${host}:${port}`);
  } catch (err) {
    logger.error({ err }, 'No se pudo arrancar el servidor');
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);

const isMainModule =
  process.argv[1] === __filename ||
  process.argv[1]?.replace(/\\/g, '/') === __filename ||
  process.argv[1]?.endsWith('server.js');

if (isMainModule) {
  start().catch((err) => {
    console.error('Fallo crítico al iniciar el servidor:', err);
    process.exit(1);
  });
}