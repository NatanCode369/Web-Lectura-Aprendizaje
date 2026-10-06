import { sendError } from '../../shared/http.js';
import { requireRole } from '../../shared/authorization/policies.js';
import { AppError } from '../../shared/errors/AppError.js';
import { readingListQuery, readingPatchBody, readingWriteBody } from './reading.schemas.js';

export async function registerReadingRoutes(
  app,
  { auth, readingService, prefix = '/api/v1/readings' }
) {
  app.get('/api/v1/readings', { preHandler: [authenticate, requireRoles('student', 'teacher', 'admin')], schema: { querystring: readingListQuery } }, async (request, reply) => {
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

  app.get('/api/v1/readings/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      return reply.send(await readingService.getById(request.params.id, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  app.post('/api/v1/readings', {
    preHandler: [authenticate, requireRoles('teacher', 'admin')],
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
    preHandler: [authenticate, requireRoles('teacher', 'admin')],
    schema: { body: readingPatchBody }
  }, async (request, reply) => {
    try {
      return reply.send(await readingService.update(request.params.id, request.body, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  app.post(
    `${prefix}/:id/media`, {
    preHandler: [authenticate, requireRoles('teacher', 'admin')]
  }, async (request, reply) => {
    try {
      return reply.send(await readingService.publish(request.params.id, request.user));
    } catch (error) {
      return sendError(reply, error, request.id);
    }
  });

  /**
   * Sube un PDF y lo adjunta a la lectura.
   * multipart/form-data con un campo `file`.
   */
  app.post(
    '/api/v1/readings/:id/media',
    { preHandler: [authenticate, requireRoles('teacher', 'admin')] },
    async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          throw AppError.badRequest('No se recibió ningún archivo');
        }

        const buffer = await data.toBuffer();

        const updated = await readingService.uploadPdf(
          request.params.id,
          {
            buffer,
            mimetype: data.mimetype,
            filename: data.filename,
            size: buffer.length
          },
          request.user
        );

        return reply.code(201).send(updated);
      } catch (error) {
        return sendError(reply, error, request.id);
      }
    }
  );
}