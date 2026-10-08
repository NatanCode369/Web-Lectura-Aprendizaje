import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { connectDb, closeDb, pingDb } from './shared/db.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { requestId } from './shared/middleware/requestId.js';
import { registerEdgeGuard, clientKey } from './shared/edge.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { assignmentsRoutes } from './modules/assignments/assignments.routes.js';
import { studentAssignmentsRoutes } from './modules/studentAssignments/studentAssignments.routes.js';
import { attemptsRoutes } from './modules/attempts/attempts.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';

import { buildReadingRepository } from './modules/readings/reading.repository.js';
import { buildAuditRepository } from './modules/readings/audit.repository.js';
import { buildReadingService } from './modules/readings/reading.service.js';
import { authenticate } from './shared/middleware/authenticate.js';
import { registerReadingRoutes } from './modules/readings/reading.routes.js';

export async function buildServer({ withDb = true } = {}) {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    trustProxy: true,
  });

  fastify.addHook('onRequest', requestId);

  // ---- Plugins de seguridad ----
  await fastify.register(helmet, { contentSecurityPolicy: false });

  // ---- CORS ----
  // Dev: permite cualquier localhost/127.0.0.1 y los orígenes configurados.
  // Prod: solo los orígenes de CORS_ORIGINS.
  const isDev = env.NODE_ENV !== 'production';
  const allowedOrigins = Array.isArray(env.CORS_ORIGINS)
    ? env.CORS_ORIGINS
    : String(env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Sin Origin: PowerShell, curl, health checks, Postman
      if (!origin) {
        return callback(null, true);
      }

      // Origen explícitamente permitido
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // En dev: permitir cualquier localhost/127.0.0.1 en cualquier puerto
      if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // En dev: permitir cualquier IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (isDev && /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      logger.warn({ origin, allowedOrigins }, 'CORS: origen no permitido');
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  registerEdgeGuard(fastify, {
    secret: env.ORIGIN_SHARED_SECRET,
    requireEdge: env.REQUIRE_EDGE,
  });

  // ---- Cookies HttpOnly (ADR 0004) ----
  await fastify.register(cookie, {
    secret: env.COOKIE_SECRET,
  });

  await fastify.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (req) => clientKey(req, env.ORIGIN_SHARED_SECRET),
    errorResponseBuilder: (req) => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiadas peticiones. Intenta de nuevo en unos segundos.',
        requestId: req.id,
      },
    }),
  });

  // multipart para subir PDFs
  await fastify.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1,
      fields: 5,
    },
  });

  // ---- Manejo de errores global ----
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

  // ---- Conexión a MongoDB ----
  let db = null;
  if (withDb) {
    db = await connectDb();
  }

  // ---- Health checks ----
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

  // ---- Rutas de negocio ----
  await fastify.register(authRoutes, { prefix: '/api/v1/auth', db });
  await fastify.register(usersRoutes, { prefix: '/api/v1', db });

  await fastify.register(groupsRoutes, { prefix: '/api/v1/groups', db });
  await fastify.register(assignmentsRoutes, { prefix: '/api/v1/assignments', db });
  await fastify.register(attemptsRoutes, { prefix: '/api/v1/assignments', db });
  await fastify.register(studentAssignmentsRoutes, { prefix: '/api/v1/student-assignments', db });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics', db });

  // ---- Readings ----
  const readingRepository = buildReadingRepository();
  const auditRepository = buildAuditRepository();
  const readingService = buildReadingService({ readingRepository, auditRepository });

  const authMiddleware = authenticate(db);

  await registerReadingRoutes(fastify, {
    authenticate: authMiddleware,
    readingService,
    prefix: '/api/v1/readings',
  });

  // ---- Cierre ordenado ----
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
    const host = process.env.HOST ?? '0.0.0.0';

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