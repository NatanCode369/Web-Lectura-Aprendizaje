import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { studentAssignmentsService } from './studentAssignments.service.js';

export async function studentAssignmentsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/me/assignments',
    { preHandler: requireRole('student') },
    async (request) => {
      const query = {
        status: request.query.status,
        page: Number(request.query.page ?? 1),
        limit: Number(request.query.limit ?? 20),
      };
      return studentAssignmentsService.listMine(request.user._id, query);
    }
  );

  fastify.get(
    '/me/assignments/:id',
    { preHandler: requireRole('student') },
    async (request) => {
      return studentAssignmentsService.getMine(
        request.user._id,
        request.params.id
      );
    }
  );
}