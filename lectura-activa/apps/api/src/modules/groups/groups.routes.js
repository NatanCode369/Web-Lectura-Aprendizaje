import { requireRole } from '../../shared/authorization/policies.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { groupsService } from './groups.service.js';
import { validate } from '../../shared/validation/index.js';
import {
  createGroupSchema,
  updateGroupSchema,
  addStudentsSchema,
  listGroupsSchema,
} from './groups.schemas.js';

export async function groupsRoutes(fastify, opts) {
  const { db } = opts;
  const authMiddleware = authenticate(db);

  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/', async (request) => {
    const query = validate(listGroupsSchema, request.query);
    return groupsService.list(request.user, query);
  });

  fastify.post(
    '/',
    { preHandler: requireRole('teacher', 'admin') },
    async (request, reply) => {
      const payload = validate(createGroupSchema, request.body);
      const group = await groupsService.create(request.user, payload);
      return reply.status(201).send(group);
    }
  );

  fastify.get('/:id', async (request) => {
    return groupsService.getById(request.user, request.params.id);
  });

  fastify.patch(
    '/:id',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const patch = validate(updateGroupSchema, request.body);
      return groupsService.update(request.user, request.params.id, patch);
    }
  );

  fastify.delete(
    '/:id',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      return groupsService.remove(request.user, request.params.id);
    }
  );

  fastify.post(
    '/:id/students',
    { preHandler: requireRole('teacher', 'admin') },
    async (request) => {
      const { studentIds } = validate(addStudentsSchema, request.body);
      return groupsService.addStudents(request.user, request.params.id, studentIds);
    }
  );

  fastify.delete(
    '/:id/students/:studentId',
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