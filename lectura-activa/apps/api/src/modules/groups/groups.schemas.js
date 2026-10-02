import Joi from 'joi';

export const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  schoolYear: Joi.string().trim().max(20).required(),
  studentIds: Joi.array().items(Joi.string().hex().length(24)).default([])
});

export const updateGroupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  schoolYear: Joi.string().trim().max(20),
  status: Joi.string().valid('active', 'archived')
}).min(1);

export const addStudentsSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required()
});

export const listGroupsSchema = Joi.object({
  status: Joi.string().valid('active', 'archived'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});