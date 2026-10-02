import { AppError } from '../errors/index.js';

/**
 * Middleware de Fastify para exigir que el usuario esté autenticado.
 * Se usa en las rutas así: { preHandler: requireSession }
 */
export async function requireSession(request, reply) {
  if (!request.user) {
    throw AppError.unauthorized('UNAUTHENTICATED', 'Se requiere una sesión válida para acceder a este recurso.');
  }
}

/**
 * Obtiene el usuario de la sesión (útil para servicios que necesitan el objeto user).
 */
export function getSessionUser(request) {
  if (!request.user) {
    throw AppError.unauthorized('UNAUTHENTICATED', 'No autenticado');
  }
  return request.user;
}