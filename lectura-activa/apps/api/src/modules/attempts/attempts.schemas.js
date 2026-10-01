import Joi from 'joi';

export const startAttemptSchema = Joi.object({
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