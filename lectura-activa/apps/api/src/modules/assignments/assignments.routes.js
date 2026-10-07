import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/validation/index.js';
import { assignmentsService } from './assignments.service.js';
import { attemptsService } from '../attempts/attempts.service.js';
import {
  createAssignmentSchema,
  listAssignmentsSchema,
  startAssignmentSchema,
  submitAttemptSchema,
} from './assignments.schemas.js';

export async function assignmentsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/assignments',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const query = validate(listAssignmentsSchema, request.query);
      return assignmentsService.listForTeacher(request.user, query);
    }
  );

  fastify.post(
    '/assignments',
    { preHandler: requireRole('teacher', 'admin') },
    async (request, reply) => {
      const payload = validate(createAssignmentSchema, request.body);
      const created = await assignmentsService.create(request.user, payload);
      return reply.status(201).send(created);
    }
  );

  fastify.get(
    '/assignments/:id',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) =>
      assignmentsService.getByIdForTeacher(request.user, request.params.id)
  );

  fastify.post(
    '/assignments/:id/close',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => assignmentsService.close(request.user, request.params.id)
  );

  fastify.post(
    '/assignments/:id/start',
    { preHandler: requireRole('student') },
    async (request) => {
      const payload = validate(startAssignmentSchema, request.body);
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