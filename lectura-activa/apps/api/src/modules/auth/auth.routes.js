/**
 * Rutas del módulo auth.
 */

import { env } from '../../config/env.js';
import { supabaseAuth, supabaseReady } from '../../config/supabase.js';
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

  function setSessionCookies(reply, session) {
    const accessTokenMaxAge =
      Number.isInteger(session.expires_in) && session.expires_in > 0
        ? session.expires_in
        : 60 * 60;

    reply.setCookie('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: accessTokenMaxAge,
    });

    reply.setCookie('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  function clearSessionCookies(reply) {
    reply.clearCookie('sb-access-token', { path: '/' });
    reply.clearCookie('sb-refresh-token', { path: '/' });
  }

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
        await service.auditDomainRejection(email);
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

    setSessionCookies(reply, session);

    const { authUserId, deletedAt, ...safeUser } = user;
    return reply.send({ user: safeUser });
  });

  // ============================================================
  // POST /refresh
  // ============================================================
  fastify.post('/refresh', async (req, reply) => {
    if (!supabaseReady) {
      return reply.code(503).send({
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'El servicio de autenticación no está configurado todavía.',
          requestId: req.id,
        },
      });
    }

    const refreshToken = req.cookies?.['sb-refresh-token'];
    if (!refreshToken) {
      clearSessionCookies(reply);
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No hay una sesión que renovar.',
          requestId: req.id,
        },
      });
    }

    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session?.access_token || !data.session.refresh_token) {
      const transient =
        error?.name === 'AuthRetryableFetchError' ||
        error?.status === 0 ||
        error?.status === 429 ||
        error?.status >= 500;

      req.log.warn(
        {
          errorName: error?.name,
          errorStatus: error?.status,
          errorCode: error?.code,
        },
        'No se pudo renovar la sesión con Supabase'
      );

      if (transient) {
        return reply.code(503).send({
          error: {
            code: 'AUTH_PROVIDER_UNAVAILABLE',
            message: 'No se pudo renovar la sesión temporalmente.',
            requestId: req.id,
          },
        });
      }

      clearSessionCookies(reply);
      return reply.code(401).send({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'La sesión expiró. Inicia sesión nuevamente.',
          requestId: req.id,
        },
      });
    }

    setSessionCookies(reply, data.session);
    return reply.send({ ok: true });
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
    clearSessionCookies(reply);

    const actorId = req.user?._id ?? null;
    const result = await service.logout(actorId);
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