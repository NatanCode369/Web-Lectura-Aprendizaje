/**
 * Middleware de autenticación — FLUJO ÚNICO (ADR 0001 + ADR 0004).
 *
 * 1. Extrae el token del header Authorization O de la cookie HttpOnly.
 * 2. Valida el JWT contra Supabase.
 * 3. Lazy provisioning en MongoDB.
 * 4. Inyecta `request.user` con el objeto completo del usuario.
 *
 * Orden de prioridad:
 *   1. Header `Authorization: Bearer <JWT>` (para tests, CLI, móvil).
 *   2. Cookie `sb-access-token` (para navegador).
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

    // --- Extraer token: header primero, cookie como fallback ---
    let authToken = null;

    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme === 'Bearer' && token) {
      authToken = token;
    }

    if (!authToken) {
      authToken = req.cookies?.['sb-access-token'] ?? null;
    }

    if (!authToken) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Falta el token de autenticación.',
          requestId: req.id,
        },
      });
    }

    // --- Validar JWT contra Supabase ---
    const { data, error } = await supabaseAuth.auth.getUser(authToken);
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

    // --- Lazy provisioning ---
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

    // --- Inyectar usuario completo (convención request.user) ---
    req.user = appUser;
  };
}