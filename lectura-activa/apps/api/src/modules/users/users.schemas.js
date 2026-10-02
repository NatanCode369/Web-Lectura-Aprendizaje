/**
 * Esquemas de validación para users.
 */

export const patchMeSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      fullName: {
        type: 'string',
        minLength: 1,
        maxLength: 120,
      },
      profile: {
        type: 'object',
        additionalProperties: false,
        properties: {
          avatarUrl: {
            type: ['string', 'null'],
            maxLength: 500,
          },
          preferences: {
            type: 'object',
          },
        },
      },
    },
  },
};