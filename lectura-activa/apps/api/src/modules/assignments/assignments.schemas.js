import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Esquema para crear una nueva asignación de lectura a un grupo.
 * Incluye validación cruzada: la fecha de entrega debe ser posterior a la de disponibilidad.
 * timeLimit: límite de tiempo en minutos para completar la asignación (opcional)
 */
export const createAssignmentSchema = z.object({
  readingId: objectIdSchema,
  groupId: objectIdSchema,
  availableFrom: z.string().datetime({ 
    message: 'availableFrom debe ser una fecha ISO 8601 válida (ej: 2024-01-01T00:00:00Z)' 
  }),
  dueAt: z.string().datetime({ 
    message: 'dueAt debe ser una fecha ISO 8601 válida' 
  }),
  timeLimit: z.number()
    .int('El timeLimit debe ser un número entero de minutos')
    .min(1, 'El timeLimit debe ser al menos 1 minuto')
    .max(10080, 'El timeLimit no puede exceder 10080 minutos (7 días)')
    .optional()
}).refine(
  (data) => new Date(data.dueAt).getTime() > new Date(data.availableFrom).getTime(),
  {
    message: 'La fecha de entrega (dueAt) debe ser estrictamente posterior a la fecha de disponibilidad (availableFrom)',
    path: ['dueAt'] // Apunta el error específicamente a este campo en la respuesta de Fastify
  }
);

export const listAssignmentsSchema = z.object({
  groupId: objectIdSchema.optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const startAssignmentSchema = z.object({
  requestId: z.string().uuid()
});

export const submitAttemptSchema = z.object({
  requestId: z.string().uuid(),
  activityId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  timeSpentSeconds: z.number()
    .integer()
    .min(0)
    .max(60 * 60 * 6)
    .default(0)
});