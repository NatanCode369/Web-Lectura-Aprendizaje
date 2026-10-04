/**
 * Punto de entrada único (Barrel File) para los errores de la aplicación.
 */
export { 
    AppError, 
    ValidationError, 
    NotFoundError, 
    ConflictError, 
    UnauthorizedError, 
    ForbiddenError, 
    ErrorCodes 
  } from './AppError.js';