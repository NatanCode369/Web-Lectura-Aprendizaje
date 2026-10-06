export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Autenticación requerida') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'No tienes permisos para realizar esta operación') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Recurso no encontrado') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message, details) => new AppError(409, 'CONFLICT', message, details);

export {
  ErrorCodes,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from './errors/AppError.js';
