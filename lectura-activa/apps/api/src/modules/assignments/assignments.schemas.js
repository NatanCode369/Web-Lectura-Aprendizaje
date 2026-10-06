import Joi from 'joi';

export const createAssignmentSchema = Joi.object({
  readingId: Joi.string().hex().length(24).required(),
  groupId: Joi.string().hex().length(24).required(),
  availableFrom: Joi.date().iso().required(),
  dueAt: Joi.date().iso().greater(Joi.ref('availableFrom')).required(),
  timeLimitMinutes: Joi.number().integer().min(1).max(180).default(20)
});

export const listAssignmentsSchema = Joi.object({
  groupId: Joi.string().hex().length(24),
  status: Joi.string().valid('draft', 'published', 'closed'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const startAssignmentSchema = Joi.object({
  requestId: Joi.string().uuid().required()
});

export const submitAttemptSchema = Joi.object({
  requestId: Joi.string().uuid().required(),
  activityId: Joi.string().required(),
  answers: Joi.object().required(),
  timeSpentSeconds: Joi.number()
    .integer()
    .min(0)
    .max(60 * 60 * 6)
    .default(0)
});