/**
 * Casos de uso de auth.
 */

import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { env } from '../../config/env.js';
import { adminsRepo, teachersRepo } from './auth.repository.js';
import { resolveRoleFromWhitelist, shouldUpdateRole } from './roles.domain.js';
import {
  supabaseAuth,
  supabaseAdmin,
  supabaseReady,
  supabaseAdminReady,
} from '../../config/supabase.js';
import { createMailer } from '../../shared/mailer.js';
import { usersRepo } from '../users/users.repository.js';
import { buildNewUserDoc } from '../users/users.domain.js';
import { institutionsRepo, passwordResetsRepo } from './auth.repository.js';
import {
  extractDomain,
  normalizeEmail,
  defaultRoleForNewUser,
} from './auth.domain.js';
import {
  generateResetToken,
  hashResetToken,
  isValidTokenFormat,
  calculateExpiration,
  buildPasswordResetDoc,
  buildResetLink,
  buildResetEmailHtml,
  buildResetEmailText,
} from './password-reset.domain.js';

export function authService(db) {
  const institutions = institutionsRepo(db);
  const users = usersRepo(db);
  const passwordResets = passwordResetsRepo(db);
  const admins = adminsRepo(db);
  const teachers = teachersRepo(db);
  const mailer = createMailer();

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

  // Resolver el rol según la whitelist (P1, 07-Oct-2026).
  const adminEmails = await admins.findAllEmails();
  const teacherEmails = await teachers.findAllEmails();
  const resolvedRole = resolveRoleFromWhitelist(email, {
    admins: adminEmails,
    teachers: teacherEmails,
  });

  // 1. ¿Ya existe?
  const existing = await users.findByAuthUserId(authUserId);
  if (existing) {
    // Si el rol cambió (usuario promovido a admin/teacher), actualizar.
    if (shouldUpdateRole(existing.role, resolvedRole)) {
      const updated = await users.updateById(existing._id, {
        role: resolvedRole,
      });
      return updated ?? existing;
    }
    return existing;
  }

  // 2. Defensa en profundidad: revalidar dominio antes de crear
  const validation = await this.validateEmailDomain(email);
  if (!validation.allowed) {
    throw AppError.forbidden(
      ErrorCodes.DOMAIN_NOT_ALLOWED,
      'El dominio de tu correo no está autorizado.'
    );
  }

  // 3. Crear documento con el rol resuelto por whitelist
  const doc = buildNewUserDoc({
    authUserId,
    email,
    fullName: claims.user_metadata?.full_name ?? null,
    institutionId: validation.institutionId,
    role: resolvedRole,
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

    async register(email, password, fullName) {
      ensureSupabaseAdminReady();

      const normalized = normalizeEmail(email);

      const validation = await this.validateEmailDomain(normalized);
      if (!validation.allowed) {
        throw AppError.forbidden(
          ErrorCodes.DOMAIN_NOT_ALLOWED,
          'El dominio del correo no está autorizado.'
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: normalized,
        password,
        // P1 (07-Oct-2026): auto-confirmar siempre. La pertenencia se valida
        // por dominio institucional (hook before-user-created + validateEmailDomain).
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

            if (error) {
        const msg = error.message?.toLowerCase() ?? '';

        // P1 (07-Oct-2026): separar "correo duplicado" de "contraseña inválida".
        // Correo duplicado: 'already registered', 'duplicate', 'user already exists'.
        if (msg.includes('already') || msg.includes('duplicate')) {
          throw AppError.conflict(
            ErrorCodes.EMAIL_ALREADY_EXISTS,
            'Ese correo ya está registrado.'
          );
        }

        // Contraseña débil o rechazada por Supabase (error 422 con mensaje de password).
        if (msg.includes('password') || msg.includes('weak')) {
          throw AppError.unprocessable(
            'WEAK_PASSWORD',
            'La contraseña no cumple los requisitos de seguridad.'
          );
        }

        // Otros 422: validación.
        if (error.status === 422) {
          throw AppError.badRequest(
            'VALIDATION_ERROR',
            'Los datos enviados no son válidos.'
          );
        }

        // Fallback: error desconocido.
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

    async logout() {
      return { ok: true };
    },

    /**
     * POST /api/v1/auth/forgot-password
     *
     * Genera un token propio, lo guarda hasheado en Mongo y envía un correo
     * con el link para restablecer la contraseña.
     *
     * SIEMPRE responde OK (no revela si el email existe o no).
     */
    async forgotPassword(email, requestIp) {
      ensureSupabaseAdminReady();

      const normalized = normalizeEmail(email);

      // Verificar que el dominio sea institucional.
      // Si no lo es, NO revelamos el error y devolvemos ok: true.
      const validation = await this.validateEmailDomain(normalized);
      if (!validation.allowed) {
        return { ok: true };
      }

      // Verificar que el usuario exista en Supabase (sin revelar al cliente).
      // P1 (07-Oct-2026): eliminado listUsers innecesario.
      // Usamos generateLink solo para verificar existencia.
      let userExists = true;
      try {
        const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: normalized,
        });
        if (linkError && linkError.message?.toLowerCase().includes('not found')) {
          userExists = false;
        }
      } catch (err) {
        userExists = false;
      }

      if (!userExists) {
        // Silencioso: respondemos ok sin enviar correo.
        return { ok: true };
      }

      // Invalidar tokens previos del mismo email.
      await passwordResets.invalidateAllForEmail(normalized);

      // Generar nuevo token.
      const token = generateResetToken();
      const tokenHash = hashResetToken(token);
      const expiresAt = calculateExpiration(env.RESET_TOKEN_TTL_MINUTES);

      await passwordResets.create(
        buildPasswordResetDoc({
          email: normalized,
          tokenHash,
          expiresAt,
          requestIp,
        })
      );

      // Construir link y correo.
      const resetLink = buildResetLink(env.FRONTEND_URL, token);
      const html = buildResetEmailHtml({
        fullName: null,
        resetLink,
        ttlMinutes: env.RESET_TOKEN_TTL_MINUTES,
      });
      const text = buildResetEmailText({
        resetLink,
        ttlMinutes: env.RESET_TOKEN_TTL_MINUTES,
      });

      try {
        await mailer.send({
          to: normalized,
          subject: 'Recuperación de contraseña — Lectura Activa',
          html,
          text,
        });
      } catch (err) {
        // No revelar al cliente, pero loguear.
        console.error('Error enviando correo de recuperación:', err);
      }

      return { ok: true };
    },

    /**
     * POST /api/v1/auth/reset-password
     *
     * Valida el token y actualiza la contraseña en Supabase.
     */
    async resetPassword(token, newPassword) {
      ensureSupabaseAdminReady();

      // 1. Validar formato del token.
      if (!isValidTokenFormat(token)) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

      // 2. Validar fortaleza de la contraseña.
      if (!newPassword || newPassword.length < 8) {
        throw AppError.badRequest(
          'WEAK_PASSWORD',
          'La contraseña debe tener al menos 8 caracteres.'
        );
      }

      // 3. Buscar el token en Mongo.
      const tokenHash = hashResetToken(token);
      const record = await passwordResets.findByTokenHash(tokenHash);

      if (!record) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

      // 4. Verificar que no esté usado.
      if (record.usedAt) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'Este enlace ya fue usado. Solicita uno nuevo.'
        );
      }

      // 5. Verificar expiración.
      if (new Date(record.expiresAt) < new Date()) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

      // 6. Buscar el usuario en Supabase por email.
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: record.email,
        });

      if (linkError || !linkData?.user?.id) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

      // 7. Actualizar contraseña.
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(linkData.user.id, {
          password: newPassword,
        });

      if (updateError) {
        throw AppError.internal(
          'RESET_PASSWORD_FAILED',
          'No pudimos actualizar la contraseña. Intenta de nuevo.'
        );
      }

      // 8. Marcar token como usado.
      await passwordResets.markAsUsed(tokenHash);

      return { ok: true, message: 'Contraseña actualizada correctamente.' };
    },
  };
}