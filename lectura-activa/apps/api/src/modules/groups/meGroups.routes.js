import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { groupsService } from './groups.service.js';

/**
 * Router para endpoints "me" del estudiante.
 * Se registra bajo /api/v1 (sin prefix de groups) para que la URL
 * final sea /api/v1/me/groups.
 */
export async function meGroupsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.get(
    '/me/groups',
    { preHandler: requireRole('student') },
    async (request) => {
      return groupsService.listMine(request.user);
    }
  );
}