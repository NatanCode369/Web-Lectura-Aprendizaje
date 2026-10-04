import { ValidationError, ConflictError } from '../../shared/errors/index.js';

export function assertReadingPublished(reading) {
  if (!reading || reading.status !== 'published') {
    throw new ValidationError('La lectura no está publicada');
  }
}

export function assertDatesValid(availableFrom, dueAt) {
  if (new Date(dueAt) <= new Date(availableFrom)) {
    throw new ValidationError(
      'La fecha de entrega debe ser posterior a la de inicio'
    );
  }
}

export function assertAssignmentIsOpen(assignment, now = new Date()) {
  if (assignment.status !== 'published') {
    throw new ConflictError('La asignación no está publicada');
  }
  if (assignment.availableFrom && now < new Date(assignment.availableFrom)) {
    throw new ConflictError('La asignación aún no está disponible');
  }
  if (assignment.dueAt && now > new Date(assignment.dueAt)) {
    throw new ConflictError('La asignación ya venció');
  }
}

/**
 * ADR-0003: copiar sólo lo necesario para calificar sin depender de la lectura viva.
 */
export function buildActivitySnapshot(reading) {
  const activities = Array.isArray(reading.activities) ? reading.activities : [];
  return activities.map((a) => ({
    activityId: String(a.activityId ?? a._id ?? a.id),
    type: a.type,
    prompt: a.prompt ?? null,
    options: a.options ?? null,
    correctAnswer: a.correctAnswer ?? null,
    points: Number(a.points ?? 1),
    order: Number(a.order ?? 0)
  }));
}