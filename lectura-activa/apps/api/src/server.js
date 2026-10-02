import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { connectMongo, getDb, closeMongo } from './db/mongo.js';
import { buildAuth } from './shared/auth.js';
import { sendError } from './shared/http.js';
import { buildUserRepository } from './modules/users/user.repository.js';
import { buildReadingRepository } from './modules/readings/reading.repository.js';
import { buildAuditRepository } from './modules/readings/audit.repository.js';
import { buildReadingService } from './modules/readings/reading.service.js';
import { registerReadingRoutes } from './modules/readings/reading.routes.js';

export async function buildServer() {
  const app = Fastify({ logger: true, requestIdHeader: 'x-request-id', trustProxy: true });

  await app.register(helmet);
  await app.register(cors, { origin: env.corsOrigin, credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  const userRepository = buildUserRepository();
  const readingRepository = buildReadingRepository();
  const auditRepository = buildAuditRepository();
  const readingService = buildReadingService({ readingRepository, auditRepository });
  const auth = buildAuth({ userRepository });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    try {
      await getDb().command({ ping: 1 });
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unready' });
    }
  });

  await registerReadingRoutes(app, { auth, readingService });

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada', requestId: reply.request.id } }));
  app.setErrorHandler((error, request, reply) => sendError(reply, error, request.id));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await connectMongo();
    const app = await buildServer();
    await app.listen({ port: env.port, host: env.host });

    const shutdown = async (signal) => {
      app.log.info({ signal }, 'Shutting down');
      await app.close();
      await closeMongo();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(error);
    await closeMongo();
    process.exit(1);
  }
}
