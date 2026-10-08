import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { analyticsService } from './analytics.service.js';
import { runDailyAnalytics } from './analytics.jobs.js';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../../shared/errors/AppError.js';

export async function analyticsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/analytics/groups/:groupId',
    { preHandler: requireRole('teacher', 'admin') },
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
    '/analytics/readings/:readingId',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const { from, to } = request.query;
      return analyticsService.getReadingAnalytics(
        request.user,
        request.params.readingId,
        { from, to }
      );
    }
  );

  /**
   * Endpoint interno para Cloud Scheduler / cron.
   * Protegido por secreto compartido en header `x-job-secret`.
   */
  fastify.post('/analytics/jobs/daily', async (request, reply) => {
    const secret = request.headers['x-job-secret'];
    if (!env.ANALYTICS_JOB_SECRET || secret !== env.ANALYTICS_JOB_SECRET) {
      throw new ForbiddenError('INVALID_JOB_SECRET', 'Secreto de job inválido');
    }
    const result = await runDailyAnalytics({});
    return reply.send(result);
  });
}
