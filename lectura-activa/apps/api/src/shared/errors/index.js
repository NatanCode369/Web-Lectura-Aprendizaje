/**
 * Punto de entrada único (Barrel) para los errores de la aplicación.
 *
 * Convención del equipo: Forma A.
 *
 * Uso:
 *   import {
 *     AppError,
 *     ErrorCodes,
 *     NotFoundError,
 *     ForbiddenError,
 *     ValidationError,
 *     ConflictError,
 *     UnauthorizedError,
 *   } from '../../shared/errors/index.js';
 *
 *   throw new NotFoundError('Lectura');
 *   throw new ForbiddenError();
 *   throw new ValidationError('INVALID_MIME', 'Solo se aceptan PDFs');
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