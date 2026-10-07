/**
 * Casos de uso de auth.
 *
 * Orquesta dominio + repositorios. No conoce HTTP ni Fastify.
 * Lanza AppError con statusCode cuando algo falla.
 */

import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { env } from '../../config/env.js';
import {
  supabaseAuth,
  supabaseAdmin,
  supabaseReady,
  supabaseAdminReady,
} from '../../config/supabase.js';
import { usersRepo } from '../users/users.repository.js';
import { buildNewUserDoc } from '../users/users.domain.js';
import { institutionsRepo } from './auth.repository.js';
import {
  extractDomain,
  normalizeEmail,
  defaultRoleForNewUser,
} from './auth.domain.js';

export function authService(db) {
  const institutions = institutionsRepo(db);
  const users = usersRepo(db);

  /**
   * Verifica que Supabase esté configurado. Lanza 503 si no.
   */
  function ensureSupabaseReady() {
    if (!supabaseReady) {
      throw AppError.unauthorized(
        ErrorCodes.AUTH_NOT_CONFIGURED,
        'El servicio de autenticación no está configurado todavía.'
      );
    }
  }

  function ensureSupabaseAdminReady() {
    if (!supabaseAdminReady) {
      throw AppError.unauthorized(
        ErrorCodes.AUTH_NOT_CONFIGURED,
        'El servicio de autenticación no está configurado todavía.'
      );
    }
  }

  return {
    /**
     * Valida que el dominio del email pertenezca a una institución autorizada.
     * Usado por el hook `before-user-created` de Supabase.
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

      const existing = await users.findByAuthUserId(authUserId);
      if (existing) return existing;

      const validation = await this.validateEmailDomain(email);
      if (!validation.allowed) {
        throw AppError.forbidden(
          ErrorCodes.DOMAIN_NOT_ALLOWED,
          'El dominio de tu correo no está autorizado.'
        );
      }

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
        if (err?.code === 11000) {
          const raced = await users.findByAuthUserId(authUserId);
          if (raced) return raced;
        }
        throw err;
      }
    },

    /**
     * POST /api/v1/auth/login
     *
     * 1. Valida credenciales con Supabase.
     * 2. Lazy provisioning en Mongo.
     * 3. Devuelve el usuario + tokens de sesión.
     *
     * @returns {{ user: Object, session: { access_token, refresh_token, expires_in } }}
     */
    async login(email, password) {
      ensureSupabaseReady();

      const normalized = normalizeEmail(email);

      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (error || !data?.user || !data?.session) {
        throw AppError.unauthorized(
          ErrorCodes.INVALID_CREDENTIALS,
          'Correo o contraseña incorrectos.'
        );
      }

      // Lazy provisioning
      const appUser = await this.ensureUserFromJwt({
        sub: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata ?? {},
      });

      return {
        user: appUser,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        },
      };
    },

    /**
     * POST /api/v1/auth/register
     *
     * 1. Valida dominio institucional.
     * 2. Crea la cuenta en Supabase Auth (admin API).
     * 3. Devuelve el usuario creado.
     *
     * El usuario en Mongo se crea en el primer login (lazy provisioning).
     */
    async register(email, password, fullName) {
      ensureSupabaseAdminReady();

      const normalized = normalizeEmail(email);

      // 1. Validar dominio antes de crear la cuenta
      const validation = await this.validateEmailDomain(normalized);
      if (!validation.allowed) {
        throw AppError.forbidden(
          ErrorCodes.DOMAIN_NOT_ALLOWED,
          'El dominio del correo no está autorizado.'
        );
      }

      // 2. Crear usuario en Supabase
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: normalized,
  password,
  // En desarrollo: auto-confirmar para no bloquear pruebas.
  // En producción: exigir verificación por correo (contexto técnico §8.1).
  email_confirm: env.NODE_ENV !== 'production',
  user_metadata: { full_name: fullName },
});

      if (error) {
        // Detectar correo duplicado
        if (
          error.message?.toLowerCase().includes('already') ||
          error.message?.toLowerCase().includes('duplicate') ||
          error.status === 422
        ) {
          throw AppError.conflict(
            ErrorCodes.EMAIL_ALREADY_EXISTS,
            'Ese correo ya está registrado.'
          );
        }
        throw AppError.internal(
          'SUPABASE_ERROR',
          'No se pudo crear la cuenta. Intenta de nuevo.'
        );
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      };
    },

    /**
     * POST /api/v1/auth/logout
     *
     * No-op en el backend. El frontend limpia las cookies.
     * Aquí se podría invalidar el refresh token en Supabase si fuera necesario.
     */
    async logout() {
      return { ok: true };
    },

    /**
     * POST /api/v1/auth/forgot-password
     *
     * Genera link de recuperación con Supabase.
     * Siempre responde OK (no revela si el email existe).
     */
    async forgotPassword(email) {
      ensureSupabaseAdminReady();

      const normalized = normalizeEmail(email);

      // No revelar si existe o no. Ignoramos errores de "user not found".
      try {
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: normalized,
          options: {
            redirectTo: `${env.FRONTEND_URL}/src/pages/auth/forgot-password.html`,
          },
        });

        if (error && !error.message?.toLowerCase().includes('not found')) {
          // Log interno pero no revelar al cliente
          // (el logger ya lo captura)
        }
      } catch (err) {
        // Silencioso por seguridad
      }

      return { ok: true };
    },
  };
}