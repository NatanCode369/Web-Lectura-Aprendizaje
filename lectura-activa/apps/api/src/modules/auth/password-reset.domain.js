/**
 * Lógica pura de password reset.
 */

import { randomBytes, createHash } from 'node:crypto';

/**
 * Genera un token aleatorio de 32 bytes en hex (64 caracteres).
 */
export function generateResetToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Hashea el token con SHA-256 (para guardar en la BD).
 */
export function hashResetToken(token) {
  if (typeof token !== 'string') return null;
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Valida formato básico del token (64 caracteres hex).
 */
export function isValidTokenFormat(token) {
  if (typeof token !== 'string') return false;
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Calcula la fecha de expiración desde ahora.
 */
export function calculateExpiration(ttlMinutes) {
  const now = Date.now();
  return new Date(now + ttlMinutes * 60 * 1000);
}

/**
 * Construye el documento para guardar en `passwordResets`.
 */
export function buildPasswordResetDoc({ email, tokenHash, expiresAt, requestIp }) {
  return {
    email,
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: new Date(),
    requestIp: requestIp ?? null,
  };
}

/**
 * Construye el link de reset para enviar por correo.
 */
export function buildResetLink(frontendUrl, token) {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/src/pages/auth/reset-password.html?token=${token}`;
}

/**
 * Construye el HTML del correo.
 */
export function buildResetEmailHtml({ fullName, resetLink, ttlMinutes }) {
  const name = fullName ? `Hola ${fullName},` : 'Hola,';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Recuperación de contraseña — Lectura Activa</h2>
      <p>${name}</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
      <p style="margin: 24px 0;">
        <a href="${resetLink}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#6b7280; font-size:14px;">Este enlace expira en ${ttlMinutes} minutos. Si no solicitaste el cambio, ignora este correo.</p>
      <p style="color:#6b7280; font-size:12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${resetLink}</p>
    </div>
  `.trim();
}

/**
 * Construye la versión texto plano del correo.
 */
export function buildResetEmailText({ resetLink, ttlMinutes }) {
  return [
    'Recuperación de contraseña — Lectura Activa',
    '',
    'Recibimos una solicitud para restablecer tu contraseña.',
    `Haz clic en el siguiente enlace para crear una nueva (expira en ${ttlMinutes} minutos):`,
    '',
    resetLink,
    '',
    'Si no solicitaste el cambio, ignora este correo.',
  ].join('\n');
}
