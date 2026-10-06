/**
 * Rutas del módulo users.
 *
 * - GET  /me → devuelve el perfil del usuario autenticado.
 * - PATCH /me → actualiza fullName y profile (nada más).
 *
 * Ambas requieren Bearer JWT válido de Supabase.
 */

import { usersRepo } from './users.repository.js';
import { usersService } from './users.service.js';
import { patchMeSchema } from './users.schemas.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { AppError, ErrorCodes } from '../../shared/errors/index.js';

export async function usersRoutes(fastify, opts) {
  const { db } = opts;
  const repo = usersRepo(db);
  const service = usersService(repo);
  const auth = authenticate(db);

  // ---------- GET /me ----------
  fastify.get(
    '/me',
    { preHandler: [auth] },
    async (req) => {
      const user = await repo.findById(req.auth.userId);
      if (!user) {
        throw AppError.notFound(
          ErrorCodes.USER_NOT_FOUND,
          'Usuario no encontrado.'
        );
      }
      return { user: sanitize(user) };
    }
  );

  // ---------- PATCH /me ----------
  fastify.patch(
    '/me',
    { preHandler: [auth], schema: patchMeSchema },
    async (req) => {
      const updated = await service.updateMe(req.auth.userId, req.body);
      if (!updated) {
        throw AppError.notFound(
          ErrorCodes.USER_NOT_FOUND,
          'Usuario no encontrado.'
        );
      }
      return { user: sanitize(updated) };
    }
  );
}

/**
 * Nunca devolvemos authUserId ni deletedAt al cliente.
 */
function sanitize(user) {
  const { authUserId, deletedAt, ...safe } = user;
  return safe;
}