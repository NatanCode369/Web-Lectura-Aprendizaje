import { ValidationError, ConflictError } from '../../shared/errors/AppError.js';

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
 * Incluye campos específicos por tipo: items (ordering), pairs (matching).
 * correctAnswer se incluye aquí para el backend; se filtra en attemptsService.start() para el frontend.
 */
export function buildActivitySnapshot(reading) {
  const activities = Array.isArray(reading.activities) ? reading.activities : [];
  return activities.map((a) => {
    const base = {
      activityId: String(a.activityId ?? a._id ?? a.id),
      type: a.type,
      prompt: a.prompt ?? null,
      options: a.options ?? null,
      correctAnswer: a.correctAnswer ?? null,
      points: Number(a.points ?? 1),
      order: Number(a.order ?? 0)
    };

    // Campos específicos por tipo de actividad
    if (a.type === 'ordering' && Array.isArray(a.items)) {
      base.items = a.items.map(String);
    }
    if (a.type === 'matching' && Array.isArray(a.pairs)) {
      base.pairs = a.pairs.map((p) => ({
        left: String(p.left ?? ''),
        right: String(p.right ?? '')
      }));
    }
    if (a.type === 'detective' && a.config) {
      // correctAnswer para detective: totalSynonyms para scoring
      base.correctAnswer = {
        totalSynonyms: Array.isArray(a.config.synonyms) ? a.config.synonyms.length : 0
      };
      // Pasar config al snapshot para el frontend
      base.config = {
        target: a.config.target,
        synonyms: a.config.synonyms,
        distractors: a.config.distractors
      };
    }

    return base;
  });
}