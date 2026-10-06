import { requireSession } from '../../shared/auth/session.js';
import { requireRole } from '../../shared/authorization/policies.js';
import { groupsService } from './groups.service.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/validation/index.js';
import {
  createGroupSchema,
  updateGroupSchema,
  addStudentsSchema,
  listGroupsSchema
} from './groups.schemas.js';

export async function groupsRoutes(fastify) {
  fastify.addHook('preHandler', requireSession);

  fastify.get('/groups', async (request) => {
    const query = validate(listGroupsSchema, request.query);
    return groupsService.list(request.user, query);
  });

  fastify.post(
    '/groups',
    { preHandler: requireRole('teacher', 'admin') },
    async (request, reply) => {
      const payload = validate(createGroupSchema, request.body);
      const group = await groupsService.create(request.user, payload);
      return reply.status(201).send(group);
    }
  );

  fastify.get('/groups/:id', async (request) => {
    return groupsService.getById(request.user, request.params.id);
  });

  fastify.patch(
    '/groups/:id',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const patch = validate(updateGroupSchema, request.body);
      return groupsService.update(request.user, request.params.id, patch);
    }
  );

  fastify.delete(
    '/groups/:id',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      return groupsService.remove(request.user, request.params.id);
    }
  );

  fastify.post(
    '/groups/:id/students',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const { studentIds } = validate(addStudentsSchema, request.body);
      return groupsService.addStudents(request.user, request.params.id, studentIds);
    }
  );

  fastify.delete(
    '/groups/:id/students/:studentId',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      return groupsService.removeStudent(
        request.user,
        request.params.id,
        request.params.studentId
      );
    }
  );
}