import { requireSession } from '../../shared/auth/session.js';
import { requireRole } from '../../shared/authorization/policies.js';
import { studentAssignmentsService } from './studentAssignments.service.js';

export async function studentAssignmentsRoutes(fastify) {
  fastify.addHook('preHandler', requireSession);

  fastify.get(
    '/me/assignments',
    { preHandler: requireRole('student') },
    async (request) => {
      const query = {
        status: request.query.status,
        page: Number(request.query.page ?? 1),
        limit: Number(request.query.limit ?? 20)
      };
      return studentAssignmentsService.listMine(request.user.userId, query);
    }
  );

  fastify.get(
    '/me/assignments/:id',
    { preHandler: requireRole('student') },
    async (request) => {
      return studentAssignmentsService.getMine(
        request.user.userId,
        request.params.id
      );
    }
  );
}