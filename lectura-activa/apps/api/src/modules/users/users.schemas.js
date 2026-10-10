/**
 * Esquemas de validación para users.
 */

export const patchMeSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      fullName: {
        type: "string",
        minLength: 1,
        maxLength: 120,
      },
      profile: {
        type: "object",
        additionalProperties: false,
        properties: {
          avatarUrl: {
            type: ["string", "null"],
            maxLength: 500,
          },
          preferences: {
            type: "object",
          },
        },
      },
    },
  },
};

/**
 * Schema para listar usuarios.
 * Solo se permite filtrar por role: 'student'.
 */
export const listStudentsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      role: {
        type: "string",
        enum: ["student"],
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 200,
        default: 100,
      },
      skip: {
        type: "integer",
        minimum: 0,
        default: 0,
      },
    },
  },
};
