/**
 * Paquete central de errores de la aplicación.
 *
 * Convención del equipo (Forma A): todo error controlado se lanza como INSTANCIA.
 *
 *   throw new NotFoundError('Lectura');
 *   throw new ForbiddenError();
 *   throw new ValidationError('INVALID_MIME', 'Solo se aceptan PDFs');
 *   throw new ConflictError('CONFLICT', 'La lectura cambió');
 *   throw new UnauthorizedError();
 *
 * Los métodos estáticos (AppError.badRequest, ...) y helpers funcionales
 * (badRequest, forbidden, ...) quedan DEPRECADOS. No usarlos en código nuevo.
 */

export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  // Métodos estáticos deprecados. Se mantienen para compatibilidad con
  // código antiguo. El código nuevo debe usar las subclases.
  static badRequest(code, message, details) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(code, message, details) {
    return new AppError(401, code, message, details);
  }
  static forbidden(code, message, details) {
    return new AppError(403, code, message, details);
  }
  static notFound(code, message, details) {
    return new AppError(404, code, message, details);
  }
  static conflict(code, message, details) {
    return new AppError(409, code, message, details);
  }
  static internal(code = ErrorCodes.INTERNAL_ERROR, message = 'Error interno', details) {
    return new AppError(500, code, message, details);
  }
  static unprocessable(
    code = 'UNPROCESSABLE',
    message = 'No se puede procesar la solicitud',
    meta
  ) {
    return new AppError(422, code, message, meta);
  }
}

// ---------- Subclases específicas — Forma A ----------
// Toda la app debe usar estas.

/**
 * Validación de datos de entrada.
 * Uso: throw new ValidationError('INVALID_MIME', 'Solo se aceptan PDFs');
 *      throw new ValidationError();  // código y mensaje por defecto
 */
export class ValidationError extends AppError {
  constructor(
    code = 'VALIDATION_ERROR',
    message = 'Error de validación en los datos',
    details = undefined
  ) {
    super(400, code, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Recurso no encontrado.
 * Uso: throw new NotFoundError('Lectura');
 *      → 404 NOT_FOUND "Lectura no encontrado"
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso', details = undefined) {
    super(404, 'NOT_FOUND', `${resource} no encontrado`, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflicto de estado o duplicado.
 * Uso: throw new ConflictError('CONFLICT', 'La lectura cambió');
 *      throw new ConflictError();  // código y mensaje por defecto
 */
export class ConflictError extends AppError {
  constructor(
    code = 'CONFLICT',
    message = 'El recurso ya existe o está en conflicto',
    details = undefined
  ) {
    super(409, code, message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Falta de autenticación.
 * Uso: throw new UnauthorizedError();
 *      throw new UnauthorizedError('INVALID_TOKEN', 'Token expirado');
 */
export class UnauthorizedError extends AppError {
  constructor(
    code = 'UNAUTHENTICATED',
    message = 'No autenticado',
    details = undefined
  ) {
    super(401, code, message, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Falta de autorización (autenticado pero sin permisos).
 * Uso: throw new ForbiddenError();
 *      throw new ForbiddenError('FORBIDDEN', 'No eres dueño de esta lectura');
 */
export class ForbiddenError extends AppError {
  constructor(
    code = 'FORBIDDEN',
    message = 'Acceso denegado',
    details = undefined
  ) {
    super(403, code, message, details);
    this.name = 'ForbiddenError';
  }
}

// ---------- Catálogo de códigos ----------
export const ErrorCodes = Object.freeze({
  // Auth / sesión
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',   // ← AÑADIDO POR TI
  AUTH_NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  DOMAIN_NOT_ALLOWED: 'DOMAIN_NOT_ALLOWED',
  UNAUTHORIZED_HOOK: 'UNAUTHORIZED_HOOK',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Validación y reglas
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FORBIDDEN_FIELDS: 'FORBIDDEN_FIELDS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  BAD_REQUEST: 'BAD_REQUEST',

  // Recursos y conflictos
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',

  // Infra
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // PDF / archivos
  INVALID_MIME: 'INVALID_MIME',
  MISSING_FILENAME: 'MISSING_FILENAME',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TOO_SMALL: 'FILE_TOO_SMALL',
  INVALID_PDF: 'INVALID_PDF',
});