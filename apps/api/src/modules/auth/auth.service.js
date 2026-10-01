/**
 * Casos de uso de auth.
 *
 * Orquesta dominio + repositorios. No conoce HTTP ni Fastify.
 * Lanza AppError con statusCode cuando algo falla.
 */

import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { usersRepo } from '../users/users.repository.js';
import { buildNewUserDoc } from '../users/users.domain.js';
import { institutionsRepo } from './auth.repository.js';
import {
  extractDomain,
  isDomainAllowed,
  normalizeEmail,
  defaultRoleForNewUser,
} from './auth.domain.js';

export function authService(db) {
  const institutions = institutionsRepo(db);
  const users = usersRepo(db);

  return {
    /**
     * Valida que el dominio del email pertenezca a una institución autorizada.
     * Usado por el hook `before-user-created` de Supabase.
     *
     * @returns {{ allowed: boolean, institutionId?: string }}
     */
    async validateEmailDomain(email) {
      const normalized = normalizeEmail(email);
      const domain = extractDomain(normalized);
      if (!domain) return { allowed: false };

      const institution = await institutions.findByDomain(domain);
      if (!institution) return { allowed: false };

      return {
        allowed: true,
        institutionId: institution._id.toString(),
      };
    },

    /**
     * Lazy provisioning (ADR 0001, A2).
     * - Si el usuario ya existe por authUserId, lo devuelve.
     * - Si no existe, revalida el dominio y lo crea.
     * - Si el dominio no aplica, lanza 403 DOMAIN_NOT_ALLOWED.
     *
     * @param {{ sub: string, email: string, user_metadata?: object }} claims
     */
    async ensureUserFromJwt(claims) {
      const authUserId = claims?.sub;
      const rawEmail = claims?.email;

      if (!authUserId || !rawEmail) {
        throw AppError.unauthorized(
          ErrorCodes.INVALID_TOKEN,
          'El token no contiene la información mínima requerida.'
        );
      }

      const email = normalizeEmail(rawEmail);

      // 1. ¿Ya existe?
      const existing = await users.findByAuthUserId(authUserId);
      if (existing) return existing;

      // 2. Defensa en profundidad: revalidar dominio antes de crear
      const validation = await this.validateEmailDomain(email);
      if (!validation.allowed) {
        throw AppError.forbidden(
          ErrorCodes.DOMAIN_NOT_ALLOWED,
          'El dominio de tu correo no está autorizado.'
        );
      }

      // 3. Crear documento
      const doc = buildNewUserDoc({
        authUserId,
        email,
        fullName: claims.user_metadata?.full_name ?? null,
        institutionId: validation.institutionId,
        role: defaultRoleForNewUser(),
      });

      try {
        return await users.create(doc);
      } catch (err) {
        // Condición de carrera: otro request creó el usuario entre el find y el insert.
        // El índice único en authUserId lo detecta. Devolvemos el existente.
        if (err?.code === 11000) {
          const raced = await users.findByAuthUserId(authUserId);
          if (raced) return raced;
        }
        throw err;
      }
    },
  };
}