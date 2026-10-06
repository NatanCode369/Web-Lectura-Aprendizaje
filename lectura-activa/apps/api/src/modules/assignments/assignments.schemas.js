import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createAssignmentSchema = z.object({
  readingId: objectIdSchema,
  groupId: objectIdSchema,
  availableFrom: z.coerce.date(),
  dueAt: z.coerce.date(),
  timeLimitMinutes: z.number().int().min(1).max(180).default(20)
}).refine((data) => data.dueAt > data.availableFrom, {
  message: 'La fecha de entrega debe ser posterior a la de inicio',
  path: ['dueAt']
});

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
    .int()
    .min(0)
    .max(60 * 60 * 6)
    .default(0)
});