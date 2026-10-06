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

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 254,
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
    },
  },
};

/**
 * POST /api/v1/auth/register
 * Body: { email, password, fullName }
 */
export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'fullName'],
    additionalProperties: false,
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 254,
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
      fullName: {
        type: 'string',
        minLength: 2,
        maxLength: 120,
      },
    },
  },
};

/**
 * POST /api/v1/auth/forgot-password
 * Body: { email }
 */
export const forgotPasswordSchema = {
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
};