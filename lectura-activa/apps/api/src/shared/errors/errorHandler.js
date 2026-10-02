/**
 * Manejador central de errores de Fastify.
 *
 * Reglas:
 * - Los AppError se devuelven tal cual (statusCode, code, message).
 * - Los errores de validación de Fastify (schema) se mapean a 400 VALIDATION_ERROR.
 * - Los errores desconocidos se registran con stack completo y se devuelve
 *   un 500 genérico SIN exponer detalles internos (contexto técnico §7).
 * - Todas las respuestas incluyen `requestId` para trazabilidad.
 *
 * Formato de error:
 *   { "error": { "code", "message", "requestId", "details"? } }
 */

import { AppError, ErrorCodes } from './AppError.js';

export function errorHandler(err, req, reply) {
  const requestId = req.id;

  // ---------- 1. Errores controlados (AppError) ----------
  if (err instanceof AppError) {
    req.log.warn(
      { err: { code: err.code, statusCode: err.statusCode, meta: err.meta } },
      err.message
    );
    return reply.code(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        requestId,
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

  // ---------- 4. Errores de CORS ----------
  if (err.statusCode === 403 && err.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
    return reply.code(415).send({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Formato de contenido no soportado.',
        requestId,
      },
    });
  }

  // ---------- 5. Errores desconocidos (bugs, fallos de red) ----------
  req.log.error(
    { err: { message: err.message, stack: err.stack, name: err.name } },
    'Error no controlado'
  );

  const isProduction = process.env.NODE_ENV === 'production';
  return reply.code(500).send({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Ocurrió un error inesperado.',
      requestId,
      // Solo en desarrollo exponemos el mensaje real para depurar.
      ...(isProduction ? {} : { devMessage: err.message }),
    },
  });
}