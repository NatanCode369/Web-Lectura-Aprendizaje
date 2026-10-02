import { sendError } from '../../shared/http.js';
import { requireRoles } from '../../shared/auth.js';
import { readingListQuery, readingPatchBody, readingWriteBody } from './reading.schemas.js';

export async function registerReadingRoutes(app, { auth, readingService }) {
  app.get('/api/v1/readings', { preHandler: [auth, requireRoles('student', 'teacher', 'admin')], schema: { querystring: readingListQuery } }, async (request, reply) => {
    try {
      const query = {
        ...request.query,
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 20
      };
      return reply.send(await readingService.list(query, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  app.get('/api/v1/readings/:id', { preHandler: auth }, async (request, reply) => {
    try {
      return reply.send(await readingService.getById(request.params.id, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  app.post('/api/v1/readings', {
    preHandler: [auth, requireRoles('teacher', 'admin')],
    schema: { body: readingWriteBody }
  }, async (request, reply) => {
    try {
      const created = await readingService.create(request.body, request.user);
      return reply.code(201).send(created);
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  app.patch('/api/v1/readings/:id', {
    preHandler: [auth, requireRoles('teacher', 'admin')],
    schema: { body: readingPatchBody }
  }, async (request, reply) => {
    try {
      return reply.send(await readingService.update(request.params.id, request.body, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  app.post('/api/v1/readings/:id/publish', {
    preHandler: [auth, requireRoles('teacher', 'admin')]
  }, async (request, reply) => {
    try {
      return reply.send(await readingService.publish(request.params.id, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });
}
