/**
 * Middleware de autenticación.
 *
 * Flujo:
 *  1. Extrae el Bearer token del header Authorization.
 *  2. Valida el JWT contra Supabase Auth.
 *  3. Hace lazy provisioning del usuario en MongoDB (ADR 0001, opción A2).
 *  4. Inyecta `req.auth = { userId, role, institutionId }`.
 *
 * Si Supabase no está configurado (Fase 0), responde 503 con un código
 * específico para que el frontend pueda distinguirlo de un 401 real.
 */

import { supabaseAuth, supabaseReady } from '../../config/supabase.js';
import { authService } from '../../modules/auth/auth.service.js';

export function authenticate(db) {
  const service = authService(db);

  return async function authenticateHandler(req, reply) {
    // --- Guard: Supabase aún no configurado ---
    if (!supabaseReady) {
      return reply.code(503).send({
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'El servicio de autenticación no está configurado todavía.',
          requestId: req.id,
        },
      });
    }

    // --- Extraer Bearer ---
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

    // --- Validar JWT contra Supabase ---
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

    const user = data.user;
    const claims = {
      sub: user.id,
      email: user.email,
      user_metadata: user.user_metadata ?? {},
    };

    // --- Lazy provisioning + defensa en profundidad de dominio ---
    let appUser;
    try {
      appUser = await service.ensureUserFromJwt(claims);
    } catch (err) {
      // El servicio lanza AppError con statusCode cuando el dominio no aplica.
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

    // --- Inyectar contexto en la request ---
    req.auth = {
      userId: appUser._id,
      role: appUser.role,
      institutionId: appUser.institutionId,
    };
  };
}