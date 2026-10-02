/**
 * Middleware de autorización por rol.
 *
 * Se usa DESPUÉS de `authenticate`. Asume que `req.auth` existe.
 *
 * Uso:
 *   fastify.get('/admin-only', { preHandler: [auth, requireRole('admin')] }, ...)
 *   fastify.post('/teacher-or-admin', { preHandler: [auth, requireRole('teacher','admin')] }, ...)
 */

import { AppError, ErrorCodes } from '../errors/AppError.js';

export function requireRole(...allowedRoles) {
  return async function authorizeHandler(req, _reply) {
    if (!req.auth) {
      throw AppError.unauthorized(
        ErrorCodes.UNAUTHENTICATED,
        'No autenticado.'
      );
    }

    if (!allowedRoles.includes(req.auth.role)) {
      throw AppError.forbidden(
        ErrorCodes.FORBIDDEN,
        'No tienes permiso para realizar esta acción.'
      );
    }
  };
}

/**
 * Middleware para exigir que el usuario pertenezca a una institución.
 * Útil cuando la ruta es por institución y hay que validar ownership.
 */
export function requireInstitution(req, _reply) {
  if (!req.auth?.institutionId) {
    throw AppError.forbidden(
      ErrorCodes.FORBIDDEN,
      'No perteneces a ninguna institución.'
    );
  }
}