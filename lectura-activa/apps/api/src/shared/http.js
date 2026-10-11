export function sendError(reply, error, requestId) {
  const statusCode = error.statusCode ?? 500;
  const isValidationError = Boolean(error.validation);

  // ✅ NUEVO: loguear el error siempre con stack trace para errores 500
  if (statusCode >= 500) {
    reply.log.error(
      {
        err: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
        },
      },
      '[sendError] Error 500 capturado'
    );
  } else {
    reply.log.warn(
      {
        err: {
          message: error.message,
          code: error.code,
          statusCode,
        },
      },
      '[sendError] Error controlado'
    );
  }

  const payload = {
    error: {
      code: isValidationError ? 'INVALID_QUERY' : (error.code ?? 'INTERNAL_ERROR'),
      message: statusCode >= 500
        ? 'Ocurrió un error interno'
        : isValidationError
          ? 'Búsqueda inválida'
          : error.message,
      requestId
    }
  };

  if (error.details && statusCode < 500) {
    payload.error.details = error.details;
  }

  return reply.code(statusCode).send(payload);
}