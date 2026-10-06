/**
 * Middleware de autenticación — FLUJO ÚNICO (ADR 0001).
 *
 * 1. Extrae el Bearer token.
 * 2. Valida el JWT contra Supabase.
 * 3. Lazy provisioning en MongoDB.
 * 4. Inyecta `request.user` con el objeto completo del usuario.
 */

import { supabaseAuth, supabaseReady } from '../../config/supabase.js';
import { authService } from '../../modules/auth/auth.service.js';

export function authenticate(db) {
  const service = authService(db);

  return async function authenticateHandler(req, reply) {
    if (!supabaseReady) {
      return reply.code(503).send({
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'El servicio de autenticación no está configurado todavía.',
          requestId: req.id,
        },
      });
    }

    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Falta el token de autenticación.',
          requestId: req.id,
        },
      });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return reply.code(401).send({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token inválido o expirado.',
          requestId: req.id,
        },
      });
    }

    const supaUser = data.user;
    const claims = {
      sub: supaUser.id,
      email: supaUser.email,
      user_metadata: supaUser.user_metadata ?? {},
    };

    let appUser;
    try {
      appUser = await service.ensureUserFromJwt(claims);
    } catch (err) {
      const status = err.statusCode ?? 500;
      const code = err.code ?? 'AUTH_ERROR';
      req.log.warn(
        { err: { message: err.message, code }, userId: claims.sub },
        'Fallo en ensureUserFromJwt'
      );
      return reply.code(status).send({
        error: {
          code,
          message:
            status === 403
              ? 'Tu dominio de correo no está autorizado.'
              : 'No se pudo validar la sesión.',
          requestId: req.id,
        },
      });
    }

    // Inyectar el usuario completo de Mongo (con _id, authUserId, role, etc.)
    req.user = appUser;
  };
}