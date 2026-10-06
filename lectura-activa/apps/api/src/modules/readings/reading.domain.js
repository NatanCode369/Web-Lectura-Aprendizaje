import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { validateActivities } from './activity.domain.js';

const STATUSES = new Set(['draft', 'published', 'archived']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw AppError.badRequest(`Campo inválido: ${field}`);
  }
  return value.trim();
}

function normalizeMedia(media = []) {
  if (!Array.isArray(media) || media.length > 20) throw AppError.badRequest('media debe ser un arreglo de máximo 20 elementos');
  return media.map((item) => {
    if (!item || typeof item !== 'object') throw AppError.badRequest('Cada elemento de media debe ser un objeto');
    if (!['image', 'audio', 'video'].includes(item.type)) throw AppError.badRequest('Tipo de media inválido');
    const url = requiredText(item.url, 'media.url', 2_048);
    return { type: item.type, url, alt: typeof item.alt === 'string' ? item.alt.trim().slice(0, 500) : '' };
  });
}

export function validateReadingInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw AppError.badRequest('El cuerpo debe ser un objeto');
  const output = {};

  if (!partial || input.title !== undefined) output.title = requiredText(input.title, 'title', 200);
  if (!partial || input.summary !== undefined) output.summary = requiredText(input.summary, 'summary', 1_000);
  if (!partial || input.content !== undefined) output.content = requiredText(input.content, 'content', 100_000);
  if (!partial || input.difficulty !== undefined) {
    if (!DIFFICULTIES.has(input.difficulty)) throw AppError.badRequest('difficulty inválido');
    output.difficulty = input.difficulty;
  }
  if (!partial || input.estimatedMinutes !== undefined) {
    if (!Number.isInteger(input.estimatedMinutes) || input.estimatedMinutes < 1 || input.estimatedMinutes > 600) {
      throw AppError.badRequest('estimatedMinutes debe ser un entero entre 1 y 600');
    }
    output.estimatedMinutes = input.estimatedMinutes;
  }
  if (!partial || input.media !== undefined) output.media = normalizeMedia(input.media);
  if (!partial || input.activities !== undefined) output.activities = validateActivities(input.activities);

  if (!Object.keys(output).length) throw AppError.badRequest('No hay campos para actualizar');
  return output;
}

export function assertCanEdit(reading, user) {
  const isAdmin = user.role === 'admin';
  const isOwner =
    reading.authorId.equals(user._id) ||
    reading.authorId.toString() === user._id.toString();
  if (!isAdmin && !isOwner) throw AppError.forbidden('La lectura no pertenece al docente autenticado');
  if (reading.status === 'archived') throw AppError.conflict('Una lectura archivada no puede editarse');
}

export function assertCanPublish(reading) {
  if (reading.status !== 'draft') throw AppError.conflict('Solo se pueden publicar lecturas en estado draft');
  if (!reading.activities?.length) throw AppError.conflict('La lectura debe tener al menos una actividad antes de publicarse');
}

export function buildNewReading(input, user) {
  const data = validateReadingInput(input);
  const now = new Date();
  return {
    institutionId: user.institutionId,
    title: data.title,
    summary: data.summary,
    content: data.content,
    difficulty: data.difficulty,
    estimatedMinutes: data.estimatedMinutes,
    media: data.media ?? [],
    activities: data.activities ?? [],
    status: 'draft',
    authorId: user._id,
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

export function buildReadingUpdate(input, currentVersion) {
  const data = validateReadingInput(input, { partial: true });
  return { ...data, version: currentVersion + 1, updatedAt: new Date() };
}

export function assertStatus(status) {
  if (!STATUSES.has(status)) throw AppError.badRequest('Estado de lectura inválido');
}
