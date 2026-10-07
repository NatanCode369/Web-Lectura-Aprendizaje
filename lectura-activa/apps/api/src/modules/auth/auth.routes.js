/**
 * Rutas del módulo auth.
 *
 * Endpoints públicos:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/logout
 * - POST /api/v1/auth/forgot-password
 * - POST /api/v1/auth/reset-password
 *
 * Endpoint interno:
 * - POST /api/v1/auth/internal/validate-domain
 */

import { env } from '../../config/env.js';
import { AppError, ErrorCodes } from '../../shared/errors/index.js';
import { authService } from './auth.service.js';
import {
  validateDomainSchema,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

export async function authRoutes(fastify, opts) {
  const { db } = opts;
  const service = authService(db);

  // ============================================================
  // POST /internal/validate-domain — hook de Supabase
  // ============================================================
  fastify.post(
    '/internal/validate-domain',
    { schema: validateDomainSchema },
    async (req) => {
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

  // ============================================================
  // POST /login
  // ============================================================
  fastify.post('/login', { schema: loginSchema }, async (req, reply) => {
    const { email, password } = req.body;
    const { user, session } = await service.login(email, password);

    reply.setCookie('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    reply.setCookie('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    const { authUserId, deletedAt, ...safeUser } = user;
    return reply.send({ user: safeUser });
  });

  // ============================================================
  // POST /register
  // ============================================================
  fastify.post('/register', { schema: registerSchema }, async (req, reply) => {
    const { email, password, fullName } = req.body;
    const result = await service.register(email, password, fullName);
    return reply.code(201).send(result);
  });

  // ============================================================
  // POST /logout
  // ============================================================
  fastify.post('/logout', async (req, reply) => {
    reply.clearCookie('sb-access-token', { path: '/' });
    reply.clearCookie('sb-refresh-token', { path: '/' });

    const result = await service.logout();
    return reply.send(result);
  });

  // ============================================================
  // POST /forgot-password
  // ============================================================
  fastify.post(
    '/forgot-password',
    { schema: forgotPasswordSchema },
    async (req, reply) => {
      const { email } = req.body;
      const requestIp = req.ip;
      const result = await service.forgotPassword(email, requestIp);
      return reply.send(result);
    }
  );

  // ============================================================
  // POST /reset-password
  // ============================================================
  fastify.post(
    '/reset-password',
    { schema: resetPasswordSchema },
    async (req, reply) => {
      const { token, newPassword } = req.body;
      const result = await service.resetPassword(token, newPassword);
      return reply.send(result);
    }
  );
}