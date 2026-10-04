import { z } from 'zod';

/**
 * Esquema para iniciar un intento de lectura.
 * Valida que el requestId sea un UUID válido generado por el frontend.
 */
export const startAttemptSchema = z.object({
  requestId: z.string().uuid('El requestId debe ser un UUID válido (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)')
});

/**
 * Esquema para enviar las respuestas de un intento.
 * Valida la estructura del payload, asegurando que el tiempo no exceda 6 horas.
 */
export const submitAttemptSchema = z.object({
  requestId: z.string().uuid('El requestId debe ser un UUID válido'),
  activityId: z.string().min(1, 'El activityId es obligatorio'),
  
  // z.record permite un objeto con claves dinámicas (ej: IDs de preguntas) y cualquier valor
  answers: z.record(z.any(), 'Las respuestas deben ser un objeto con pares clave-valor'),
  
  timeSpentSeconds: z.number()
    .int('El tiempo debe ser un número entero de segundos')
    .min(0, 'El tiempo no puede ser negativo')
    .max(21600, 'El tiempo máximo permitido es de 6 horas (21600 segundos)')
    .default(0)
});