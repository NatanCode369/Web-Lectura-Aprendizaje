/**
 * Esquemas de validación de entrada para el módulo auth.
 */

export const validateDomainSchema = {
  body: {
    type: 'object',
    required: ['email'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
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

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
};

export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'fullName'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
      fullName: { type: 'string', minLength: 2, maxLength: 120 },
    },
  },
};

export const forgotPasswordSchema = {
  body: {
    type: 'object',
    required: ['email'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
    },
  },
};

/**
 * POST /api/v1/auth/reset-password
 * Body: { token, newPassword }
 */
export const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['token', 'newPassword'],
    additionalProperties: false,
    properties: {
      token: {
        type: 'string',
        minLength: 64,
        maxLength: 64,
        pattern: '^[a-fA-F0-9]{64}$',
      },
      newPassword: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
    },
  },
};