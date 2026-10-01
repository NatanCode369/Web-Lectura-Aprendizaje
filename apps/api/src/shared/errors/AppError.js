/**
 * Error de aplicación con código HTTP y código de negocio.
 *
 * Todos los errores controlados del sistema heredan de esta clase.
 * Los errores NO controlados (bugs, fallos de red) los captura el
 * errorHandler y se devuelven como 500 con un mensaje genérico.
 *
 * Uso:
 *   throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
 *   throw AppError.forbidden('DOMAIN_NOT_ALLOWED', 'Dominio no autorizado');
 */

export class AppError extends Error {
  /**
   * @param {number} statusCode  Código HTTP (400, 401, 403, 404, 409, 422, 500)
   * @param {string} code        Código de negocio en SCREAMING_SNAKE_CASE
   * @param {string} message     Mensaje legible para el usuario (español neutro)
   * @param {object} [meta]      Datos adicionales para logs (NUNCA al cliente)
   */
  constructor(statusCode, code, message, meta = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
    this.isOperational = true; // Distingue errores esperados de bugs
    Error.captureStackTrace?.(this, AppError);
  }

  // ---------- Atajos por código HTTP ----------
  static badRequest(code, message, meta) {
    return new AppError(400, code, message, meta);
  }
  static unauthorized(code, message, meta) {
    return new AppError(401, code, message, meta);
  }
  static forbidden(code, message, meta) {
    return new AppError(403, code, message, meta);
  }
  static notFound(code, message, meta) {
    return new AppError(404, code, message, meta);
  }
  static conflict(code, message, meta) {
    return new AppError(409, code, message, meta);
  }
  static unprocessable(code, message, meta) {
    return new AppError(422, code, message, meta);
  }
  static internal(code, message, meta) {
    return new AppError(500, code, message, meta);
  }
}

// ---------- Códigos de error centralizados ----------
// Sirven para que el frontend pueda reaccionar sin depender del texto.
export const ErrorCodes = Object.freeze({
  // Auth
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  AUTH_NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  DOMAIN_NOT_ALLOWED: 'DOMAIN_NOT_ALLOWED',
  UNAUTHORIZED_HOOK: 'UNAUTHORIZED_HOOK',

  // Usuarios
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  FORBIDDEN_FIELDS: 'FORBIDDEN_FIELDS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Genéricos
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});