import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/validation/index.js';
import { attemptsService } from './attempts.service.js';
import { startAttemptSchema, submitAttemptSchema } from './attempts.schemas.js';

export async function attemptsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.post(
    '/:id/start',
    { preHandler: requireRole('student') },
    async (request) => {
      const payload = validate(startAttemptSchema, request.body);
      return attemptsService.start(request.user, request.params.id, payload);
    }
  );

  fastify.post(
    '/:id/attempts',
    { preHandler: requireRole('student') },
    async (request, reply) => {
      const payload = validate(submitAttemptSchema, request.body);
      const result = await attemptsService.submit(
        request.user,
        request.params.id,
        payload
      );
      return reply.status(201).send(result);
    }
  );
}