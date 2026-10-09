/**
 * Punto de entrada único (Barrel) para los errores de la aplicación.
 *
 * Convención del equipo (Forma A):
 *   throw new NotFoundError('Lectura');
 *   throw new ForbiddenError();
 *   throw new ValidationError('INVALID_MIME', 'Solo se aceptan PDFs');
 *   throw new ConflictError('CONFLICT', 'La lectura cambió');
 */

export {
  // Clase base y catálogo
  AppError,
  ErrorCodes,

  // Subclases específicas — usar estas en código nuevo
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from './AppError.js';

export { errorHandler } from './errorHandler.js';