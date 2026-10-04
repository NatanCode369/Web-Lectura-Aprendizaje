/**
 * Esquemas de validación de entrada para el módulo auth.
 * Formato JSON Schema que Fastify valida automáticamente.
 */

export const validateDomainSchema = {
  body: {
    type: 'object',
    required: ['email'],
    additionalProperties: false,
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 254,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        institutionId: { type: 'string' },
      },
    },
  },
};