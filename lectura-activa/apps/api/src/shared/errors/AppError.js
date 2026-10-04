/**
 * Error base de la aplicación.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, meta = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }

  // Atajos estáticos para uso rápido
  static badRequest(code, message, meta) { return new AppError(400, code, message, meta); }
  static unauthorized(code, message, meta) { return new AppError(401, code, message, meta); }
  static forbidden(code, message, meta) { return new AppError(403, code, message, meta); }
  static notFound(code, message, meta) { return new AppError(404, code, message, meta); }
  static conflict(code, message, meta) { return new AppError(409, code, message, meta); }
  static unprocessable(code, message, meta) { return new AppError(422, code, message, meta); }
  static internal(code, message, meta) { return new AppError(500, code, message, meta); }
}

/**
 * Clases específicas para importación directa desde la Capa de Servicio/Dominio.
 * Hacen que el código de negocio sea legible: throw new NotFoundError('Grupo');
 */
export class ValidationError extends AppError {
  constructor(code = 'VALIDATION_ERROR', message = 'Error de validación en los datos', meta = {}) {
    super(400, code, message, meta);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso', meta = {}) {
    super(404, 'NOT_FOUND', `${resource} no encontrado`, meta);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = 'El recurso ya existe o está en conflicto', meta = {}) {
    super(409, code, message, meta);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHENTICATED', message = 'No autenticado', meta = {}) {
    super(401, code, message, meta);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'Acceso denegado', meta = {}) {
    super(403, code, message, meta);
    this.name = 'ForbiddenError';
  }
}

/**
 * Códigos de error centralizados.
 */
export const ErrorCodes = Object.freeze({
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  AUTH_NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  DOMAIN_NOT_ALLOWED: 'DOMAIN_NOT_ALLOWED',
  UNAUTHORIZED_HOOK: 'UNAUTHORIZED_HOOK',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  FORBIDDEN_FIELDS: 'FORBIDDEN_FIELDS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});