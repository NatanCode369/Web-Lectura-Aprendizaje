import { AppError } from '../errors/AppError.js';

/**
 * Valida datos contra un esquema de Zod.
 * Si la validación falla, lanza un AppError con código 400 y detalles legibles.
 * 
 * @param {Object} schema - El esquema de Zod a utilizar (ej: createGroupSchema).
 * @param {Object} data - Los datos a validar (ej: request.body, request.params).
 * @param {string} location - De dónde vienen los datos ('body', 'params', 'query') para el mensaje de error.
 * @returns {Object} Los datos validados y transformados.
 */
export function validate(schema, data, location = 'body') {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Formatear los errores de Zod en un mensaje limpio y legible
    const errorMessages = result.error.issues.map(
      issue => `${issue.path.join('.') || 'campo'}: ${issue.message}`
    );

    throw new AppError(
      400, // Bad Request
      'VALIDATION_ERROR',
      `Error de validación en ${location}: ${errorMessages.join(', ')}`
    );
  }

  return result.data;
}

/**
 * Middleware de Fastify para validar el cuerpo (body) de la petición.
 * Uso: preHandler: [validateBody(mySchema)]
 */
export function validateBody(schema) {
  return async (request, reply) => {
    try {
      request.validatedBody = validate(schema, request.body, 'body');
    } catch (error) {
      // Si es un AppError, lo dejamos pasar al manejador global de errores de Fastify
      if (error.statusCode) {
        throw error;
      }
      // Si es un error inesperado, lo convertimos en 500
      throw new AppError(500, 'INTERNAL_ERROR', 'Error inesperado al validar la petición');
    }
  };
}

/**
 * Middleware de Fastify para validar parámetros de URL (params).
 * Uso: preHandler: [validateParams(mySchema)]
 */
export function validateParams(schema) {
  return async (request, reply) => {
    try {
      request.validatedParams = validate(schema, request.params, 'params');
    } catch (error) {
      if (error.statusCode) throw error;
      throw new AppError(500, 'INTERNAL_ERROR', 'Error inesperado al validar los parámetros');
    }
  };
}