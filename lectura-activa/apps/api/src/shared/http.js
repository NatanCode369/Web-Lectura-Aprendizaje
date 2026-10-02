export function sendError(reply, error, requestId) {
  const statusCode = error.statusCode ?? 500;
  const isValidationError = Boolean(error.validation);

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
