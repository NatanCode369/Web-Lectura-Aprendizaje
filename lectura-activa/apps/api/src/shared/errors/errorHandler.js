import { AppError, ErrorCodes } from './AppError.js';
import { env } from '../../config/env.js';

export function errorHandler(err, req, reply) {
  const requestId = req.id;

  // ---------- 1. Errores controlados (AppError y subclases) ----------
  if (err instanceof AppError) {
    req.log.warn(
      { err: { code: err.code, statusCode: err.statusCode, details: err.details } },
      err.message
    );
    return reply.code(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // ---------- 2. Errores de validación de Fastify (schema) ----------
  if (err.validation) {
    req.log.warn({ validation: err.validation }, 'Validación fallida');
    return reply.code(400).send({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Los datos enviados no son válidos.',
        requestId,
        details: err.validation.map((v) => ({
          field: v.instancePath || v.params?.missingProperty || '',
          message: v.message,
        })),
      },
    });
  }

  // ---------- 3. Rate limit ----------
  if (err.statusCode === 429) {
    return reply.code(429).send({
      error: {
        code: ErrorCodes.RATE_LIMITED,
        message: 'Demasiadas peticiones. Intenta de nuevo en unos segundos.',
        requestId,
      },
    });
  }

  // ---------- 4. Media type no soportado ----------
  if (err.statusCode === 403 && err.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
    return reply.code(415).send({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Formato de contenido no soportado.',
        requestId,
      },
    });
  }

  // ---------- 5. Errores desconocidos ----------
  req.log.error(
    { err: { message: err.message, stack: err.stack, name: err.name } },
    'Error no controlado'
  );

  const isProduction = env.NODE_ENV === 'production';
  return reply.code(500).send({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Ocurrió un error inesperado.',
      requestId,
      ...(isProduction ? {} : { devMessage: err.message }),
    },
  });
}