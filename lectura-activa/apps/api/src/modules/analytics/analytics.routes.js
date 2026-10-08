import { authenticate } from '../../shared/middleware/authenticate.js';
import { requireRole } from '../../shared/authorization/policies.js';
import { ForbiddenError, ErrorCodes } from '../../shared/errors/index.js';
import { analyticsService } from './analytics.service.js';
import { runDailyAnalytics } from './analytics.jobs.js';
import { env } from '../../config/env.js';

export async function analyticsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.get(
    '/groups/:groupId',
    { preHandler: [authMiddleware, requireRole('teacher', 'admin')] },
    async (request) => {
      const { from, to } = request.query;
      return analyticsService.getGroupAnalytics(
        request.user,
        request.params.groupId,
        { from, to }
      );
    }
  );

  fastify.get(
    '/readings/:readingId',
    { preHandler: [authMiddleware, requireRole('teacher', 'admin')] },
    async (request) => {
      const { from, to } = request.query;
      return analyticsService.getReadingAnalytics(
        request.user,
        request.params.readingId,
        { from, to }
      );
    }
  );

  // Job interno: NO usa auth. Valida con x-job-secret.
  fastify.post('/jobs/daily', async (request, reply) => {
    const secret = request.headers['x-job-secret'];
    if (!env.ANALYTICS_JOB_SECRET || secret !== env.ANALYTICS_JOB_SECRET) {
      throw new ForbiddenError(
        ErrorCodes.INVALID_JOB_SECRET,
        'Secreto de job inválido'
      );
    }
    return reply.send(await runDailyAnalytics({}));
  });
}