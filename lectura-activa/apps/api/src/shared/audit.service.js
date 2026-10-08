/**
 * Servicio de auditoría.
 *
 * Registra eventos críticos en la colección `auditLogs`.
 *
 * Reglas:
 * - NUNCA rompe el flujo principal. Si falla, solo loguea el error.
 * - NO guarda datos sensibles (emails, tokens, contraseñas).
 * - Los emails se enmascaran con maskEmail().
 */

import { logger } from './logger.js';

/**
 * Enmascara un email para logs.
 * "estudiante@kinal.edu.gt" → "es***@ki***.gt"
 */
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '[invalid]';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 ? local.slice(0, 2) + '***' : '***';
  const domainParts = domain.split('.');
  const maskedDomain =
    domainParts[0].length > 2
      ? domainParts[0].slice(0, 2) + '***'
      : '***';
  const tld = domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}${tld ? '.' + tld : ''}`;
}

export function auditService(db) {
  const col = db.collection('auditLogs');

  return {
    /**
     * Registra un evento de auditoría.
     *
     * @param {Object} params
     * @param {ObjectId|null} params.actorId    Usuario que hizo la acción.
     * @param {string} params.action            'login.success', 'login.failure', etc.
     * @param {string} params.resourceType      'user', 'passwordReset', etc.
     * @param {ObjectId|null} [params.resourceId]
     * @param {Object} [params.metadata]        Info contextual (ip, role, reason, etc.)
     */
    async log({ actorId = null, action, resourceType, resourceId = null, metadata = {} }) {
      try {
        await col.insertOne({
          actorId,
          action,
          resourceType,
          resourceId,
          metadata,
          createdAt: new Date(),
        });
      } catch (err) {
        // NUNCA romper el flujo principal por un fallo de auditoría.
        logger.error(
          { err: err.message, action, resourceType },
          'Fallo al registrar auditLog'
        );
      }
    },

    /**
     * Helper para enmascarar emails en metadata.
     * Exportado para reutilización desde otros módulos.
     */
    maskEmail,
  };
}