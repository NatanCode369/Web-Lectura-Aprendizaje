import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/validation/index.js';
import { assignmentsService } from './assignments.service.js';
import {
  createAssignmentSchema,
  listAssignmentsSchema,
} from './assignments.schemas.js';

export async function assignmentsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const query = validate(listAssignmentsSchema, request.query);
      return assignmentsService.listForTeacher(request.user, query);
    }
  );

  fastify.post(
    '/',
    { preHandler: requireRole('teacher', 'admin') },
    async (request, reply) => {
      const payload = validate(createAssignmentSchema, request.body);
      const created = await assignmentsService.create(request.user, payload);
      return reply.status(201).send(created);
    }
  );

  fastify.get(
    '/:id',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) =>
      assignmentsService.getByIdForTeacher(request.user, request.params.id)
  );

  fastify.post(
    '/:id/close',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => assignmentsService.close(request.user, request.params.id)
  );
}