/**
 * Rutas del módulo auth.
 *
 * - POST /internal/validate-domain → hook de Supabase (protegido por secreto).
 *
 * Este endpoint NO se expone al navegador. Solo lo llama el hook
 * before-user-created de Supabase, configurado por P7.
 */

import { env } from '../../config/env.js';
import { validateDomainSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';
import { AppError, ErrorCodes } from '../../shared/errors.js';

export async function authRoutes(fastify, opts) {
  const { db } = opts;
  const service = authService(db);

  fastify.post(
    '/internal/validate-domain',
    { schema: validateDomainSchema },
    async (req) => {
      // Verificar secreto compartido con Supabase.
      const secret = req.headers['x-internal-secret'];
      if (secret !== env.INTERNAL_HOOK_SECRET) {
        throw AppError.unauthorized(
          ErrorCodes.UNAUTHORIZED_HOOK,
          'Secreto del hook inválido.'
        );
      }

      const { email } = req.body;
      const result = await service.validateEmailDomain(email);

      if (!result.allowed) {
        throw AppError.forbidden(
          ErrorCodes.DOMAIN_NOT_ALLOWED,
          'El dominio del correo no está autorizado.'
        );
      }

      return { allowed: true, institutionId: result.institutionId };
    }
  );
}