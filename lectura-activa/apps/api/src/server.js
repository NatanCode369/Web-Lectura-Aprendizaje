import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { connectDb, closeDb, getDb, pingDb } from './shared/db.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { requestId } from './shared/middleware/requestId.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { assignmentsRoutes } from './modules/assignments/assignments.routes.js';
import { studentAssignmentsRoutes } from './modules/studentAssignments/studentAssignments.routes.js';
import { attemptsRoutes } from './modules/attempts/attempts.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';

// Módulos integrados desde ft/2023146 (Adrián - Persona 3)
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

  await registerSecurityPlugins(fastify);
  await registerHealthRoutes(fastify, { withDb });

  if (withDb) {
    await connectDb();
  }

  await registerModules(fastify, { withDb });

  fastify.addHook('onClose', async () => {
    if (withDb) await closeDb();
  });

  return fastify;
}

async function registerSecurityPlugins(fastify) {
  fastify.addHook('onRequest', requestId);
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, {
    origin: (origin, callback) => {
      const allowed = new Set((env.CORS_ORIGINS ?? []).map((item) => item.trim()));
      callback(null, !origin || allowed.has(origin));
    },
    credentials: true,
  });
  await fastify.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  fastify.setErrorHandler(errorHandler);
}

async function registerHealthRoutes(fastify, { withDb }) {
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'lectura-activa-api',
    timestamp: new Date().toISOString(),
  }));
  fastify.get('/ready', async (request, reply) => {
    const dbOk = withDb ? await pingDb() : true;
    if (!dbOk) {
      return reply.code(503).send({ error: { code: 'DB_NOT_READY', requestId: request.id } });
    }
    return { status: 'ready', db: dbOk };
  });
}

async function registerModules(fastify, { withDb }) {
  if (!withDb) return;

  const db = withDb ? getDb() : null;
  await fastify.register(authRoutes, { prefix: '/api/v1/auth', db });
  await fastify.register(usersRoutes, { prefix: '/api/v1/users', db });
  await fastify.register(groupsRoutes, { prefix: '/api/v1/groups', db });
  await fastify.register(assignmentsRoutes, { prefix: '/api/v1/assignments', db });
  await fastify.register(studentAssignmentsRoutes, { prefix: '/api/v1/student-assignments', db });
  await fastify.register(attemptsRoutes, { prefix: '/api/v1/attempts', db });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics', db });
}

/*
export async function buildServer({ withDb = true } = {}) {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    trustProxy: true, // Cloud Run va detrás de un proxy
  });

  // ---- Middleware transversal ----
  fastify.addHook('onRequest', requestId);

  // ---- Plugins de seguridad ----
  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(cors, {
    origin: (origin, callback) => {
      const allowed = new Set((env.CORS_ORIGINS ?? []).map((item) => item.trim()));

      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS no permitido para este origen'));
    },
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

  // ---- Conexión a Base de Datos (opcional para tests) ----
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

  // ---- Rutas de Negocio ----
  await fastify.register(authRoutes, { prefix: '/api/v1/auth', db });
  await fastify.register(usersRoutes, { prefix: '/api/v1/users', db });
  await fastify.register(groupsRoutes, { prefix: '/api/v1/groups', db });
  await fastify.register(assignmentsRoutes, { prefix: '/api/v1/assignments', db });
  await fastify.register(studentAssignmentsRoutes, { prefix: '/api/v1/student-assignments', db });
  await fastify.register(attemptsRoutes, { prefix: '/api/v1/attempts', db });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics', db });

  // ---- Inyección y Rutas de Readings (ft/2023146) ----
  const userRepository = buildUserRepository();
  const readingRepository = buildReadingRepository();
  const auditRepository = buildAuditRepository();
  const readingService = buildReadingService({ readingRepository, auditRepository });
  const auth = buildAuth({ userRepository });

  await registerReadingRoutes(fastify, { auth, readingService, prefix: '/api/v1/readings' });

  // ---- Cierre ordenado de conexiones ----
  fastify.addHook('onClose', async () => {
    if (withDb) {
      await closeDb();
    }
  });

  return fastify;
}
*/

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
    const port = env.PORT;
    const host = env.HOST;

    await fastify.listen({ port, host });
    logger.info(`✅ API escuchando en http://${host}:${port}`);
  } catch (err) {
    logger.error({ err }, 'No se pudo arrancar el servidor');
    process.exit(1);
  }
}

// ==========================================
// ARRANQUE DEL SERVIDOR (Entry Point)
// ==========================================
const __filename = fileURLToPath(import.meta.url);

// Verificación robusta para Windows y Linux/Mac
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