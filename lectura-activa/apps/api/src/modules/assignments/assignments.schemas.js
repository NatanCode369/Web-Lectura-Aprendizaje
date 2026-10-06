import { z } from 'zod';

// Regex reutilizable para validar ObjectIds de MongoDB (24 caracteres hexadecimales)
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Debe ser un ID válido de MongoDB (24 caracteres hexadecimales)');

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

/**
 * Esquema para listar asignaciones con filtros y paginación.
 */
export const listAssignmentsSchema = z.object({
  groupId: objectIdSchema.optional(),
  status: z.enum(['draft', 'published', 'closed'], {
    errorMap: () => ({ message: 'El estado debe ser "draft", "published" o "closed"' })
  }).optional(),
  page: z.number().int('La página debe ser un número entero').min(1).default(1),
  limit: z.number().int('El límite debe ser un número entero').min(1).max(100).default(20)
});

/**
 * Esquema para iniciar un intento de lectura (requiere un requestId válido).
 */
export const startAssignmentSchema = z.object({
  requestId: z.string().uuid('El requestId debe ser un UUID válido')
});

/**
 * Esquema para enviar las respuestas de un intento.
 * Valida que el tiempo no exceda 6 horas (21600 segundos).
 */
export const submitAttemptSchema = z.object({
  requestId: z.string().uuid('El requestId debe ser un UUID válido'),
  activityId: z.string().min(1, 'El activityId es obligatorio'),
  answers: z.record(z.any(), 'Las respuestas deben ser un objeto válido'),
  timeSpentSeconds: z.number()
    .int('El tiempo debe ser un número entero de segundos')
    .min(0, 'El tiempo no puede ser negativo')
    .max(21600, 'El tiempo máximo permitido es de 6 horas (21600 segundos)')
    .default(0)
});