import { requireSession } from '../../shared/auth/session.js';
import { requireRole } from '../../shared/authorization/policies.js';
import { validate } from '../../shared/validation/index.js';
import { attemptsService } from './attempts.service.js';
import { startAttemptSchema, submitAttemptSchema } from './attempts.schemas.js';

export async function attemptsRoutes(fastify) {
  fastify.addHook('preHandler', requireSession);

  fastify.post(
    '/assignments/:id/start',
    { preHandler: requireRole('student') },
    async (request) => {
      const payload = validate(startAttemptSchema, request.body);
      return attemptsService.start(request.user, request.params.id, payload);
    }
  );

  fastify.post(
    '/assignments/:id/attempts',
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