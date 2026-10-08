/**
 * Casos de uso de auth.
 */

import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { env } from '../../config/env.js';
import {
  supabaseAuth,
  supabaseAdmin,
  supabaseReady,
  supabaseAdminReady,
} from '../../config/supabase.js';
import { createMailer } from '../../shared/mailer.js';
import { auditService } from '../../shared/audit.service.js';
import { usersRepo } from '../users/users.repository.js';
import { buildNewUserDoc } from '../users/users.domain.js';
import { institutionsRepo, passwordResetsRepo } from './auth.repository.js';
import { adminsRepo, teachersRepo } from './auth.repository.js';
import {
  extractDomain,
  normalizeEmail,
} from './auth.domain.js';
import {
  resolveRoleFromWhitelist,
  shouldUpdateRole,
} from './roles.domain.js';
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
  const audit = auditService(db);

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

      const adminEmails = await admins.findAllEmails();
      const teacherEmails = await teachers.findAllEmails();
      const resolvedRole = resolveRoleFromWhitelist(email, {
        admins: adminEmails,
        teachers: teacherEmails,
      });

      const existing = await users.findByAuthUserId(authUserId);
      if (existing) {
        if (shouldUpdateRole(existing.role, resolvedRole)) {
          const updated = await users.updateById(existing._id, {
            role: resolvedRole,
          });

          await audit.log({
            actorId: existing._id,
            action: 'role.changed',
            resourceType: 'user',
            resourceId: existing._id,
            metadata: {
              from: existing.role,
              to: resolvedRole,
            },
          });

          return updated ?? existing;
        }
        return existing;
      }

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
        role: resolvedRole,
      });

      try {
        const created = await users.create(doc);

        await audit.log({
          actorId: created._id,
          action: 'role.assigned',
          resourceType: 'user',
          resourceId: created._id,
          metadata: {
            role: resolvedRole,
            reason: 'lazy_provisioning',
          },
        });

        return created;
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
        await audit.log({
          actorId: null,
          action: 'login.failure',
          resourceType: 'user',
          metadata: {
            email: audit.maskEmail(normalized),
            reason: 'invalid_credentials',
          },
        });
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

      await audit.log({
        actorId: appUser._id,
        action: 'login.success',
        resourceType: 'user',
        resourceId: appUser._id,
        metadata: { role: appUser.role },
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
        await audit.log({
          actorId: null,
          action: 'register.failure',
          resourceType: 'user',
          metadata: {
            email: audit.maskEmail(normalized),
            reason: 'domain_not_allowed',
          },
        });
        throw AppError.forbidden(
          ErrorCodes.DOMAIN_NOT_ALLOWED,
          'El dominio del correo no está autorizado.'
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: normalized,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (error) {
        const msg = error.message?.toLowerCase() ?? '';

        if (msg.includes('already') || msg.includes('duplicate')) {
          await audit.log({
            actorId: null,
            action: 'register.failure',
            resourceType: 'user',
            metadata: {
              email: audit.maskEmail(normalized),
              reason: 'email_exists',
            },
          });
          throw AppError.conflict(
            ErrorCodes.EMAIL_ALREADY_EXISTS,
            'Ese correo ya está registrado.'
          );
        }

        if (msg.includes('password') || msg.includes('weak')) {
          await audit.log({
            actorId: null,
            action: 'register.failure',
            resourceType: 'user',
            metadata: {
              email: audit.maskEmail(normalized),
              reason: 'weak_password',
            },
          });
          throw AppError.unprocessable(
            'WEAK_PASSWORD',
            'La contraseña no cumple los requisitos de seguridad.'
          );
        }

        if (error.status === 422) {
          await audit.log({
            actorId: null,
            action: 'register.failure',
            resourceType: 'user',
            metadata: {
              email: audit.maskEmail(normalized),
              reason: 'validation_error',
            },
          });
          throw AppError.badRequest(
            'VALIDATION_ERROR',
            'Los datos enviados no son válidos.'
          );
        }

        await audit.log({
          actorId: null,
          action: 'register.failure',
          resourceType: 'user',
          metadata: {
            email: audit.maskEmail(normalized),
            reason: 'unknown_error',
          },
        });
        throw AppError.internal(
          'SUPABASE_ERROR',
          'No se pudo crear la cuenta. Intenta de nuevo.'
        );
      }

      await audit.log({
        actorId: null,
        action: 'register.success',
        resourceType: 'user',
        resourceId: null,
        metadata: {
          email: audit.maskEmail(normalized),
          role: 'student',
        },
      });

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      };
    },

    async logout(actorId = null) {
      if (actorId) {
        await audit.log({
          actorId,
          action: 'logout',
          resourceType: 'user',
          resourceId: actorId,
          metadata: {},
        });
      }
      return { ok: true };
    },

    async forgotPassword(email, requestIp) {
      ensureSupabaseAdminReady();

      const normalized = normalizeEmail(email);

      const validation = await this.validateEmailDomain(normalized);
      if (!validation.allowed) {
        return { ok: true };
      }

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
        return { ok: true };
      }

      await passwordResets.invalidateAllForEmail(normalized);

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

        await audit.log({
          actorId: null,
          action: 'reset.requested',
          resourceType: 'passwordReset',
          metadata: { email: audit.maskEmail(normalized) },
        });
      } catch (err) {
        console.error('Error enviando correo de recuperación:', err);
      }

      return { ok: true };
    },

    async resetPassword(token, newPassword) {
      ensureSupabaseAdminReady();

      if (!isValidTokenFormat(token)) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

      if (!newPassword || newPassword.length < 8) {
        throw AppError.badRequest(
          'WEAK_PASSWORD',
          'La contraseña debe tener al menos 8 caracteres.'
        );
      }

      const tokenHash = hashResetToken(token);
      const record = await passwordResets.findByTokenHash(tokenHash);

      if (!record) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

      if (record.usedAt) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'Este enlace ya fue usado. Solicita uno nuevo.'
        );
      }

      if (new Date(record.expiresAt) < new Date()) {
        throw AppError.badRequest(
          'INVALID_RESET_TOKEN',
          'El enlace de recuperación es inválido o ha expirado.'
        );
      }

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

      await passwordResets.markAsUsed(tokenHash);

      await audit.log({
        actorId: null,
        action: 'reset.completed',
        resourceType: 'user',
        resourceId: null,
        metadata: { email: audit.maskEmail(record.email) },
      });

      return { ok: true, message: 'Contraseña actualizada correctamente.' };
    },

    /**
     * Audita un rechazo de dominio desde el hook de Supabase.
     * Se llama desde `auth.routes.js` en `/internal/validate-domain`.
     */
    async auditDomainRejection(email) {
      await audit.log({
        actorId: null,
        action: 'domain.rejected',
        resourceType: 'user',
        metadata: { email: audit.maskEmail(email) },
      });
    },
  };
}