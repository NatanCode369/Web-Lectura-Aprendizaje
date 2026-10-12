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
 *
 * ✅ FIX: las actividades guardan su configuración en `a.config`, NO en `a.options`
 *         ni en `a.correctAnswer`. Hay que copiar los campos específicos según el tipo.
 */
export function buildActivitySnapshot(reading) {
  const activities = Array.isArray(reading.activities) ? reading.activities : [];
  return activities.map((a) => {
    const config = a.config || {};

    const base = {
      activityId: String(a.activityId ?? a._id ?? a.id ?? a.id),
      type: a.type,
      prompt: a.prompt ?? null,
      options: null,
      correctAnswer: null,
      points: Number(a.points ?? 1),
      order: Number(a.order ?? 0)
    };

    // ✅ FIX: copiar la configuración específica según el tipo
    if (a.type === 'multiple_choice') {
      base.options = Array.isArray(config.options) ? config.options.map(String) : null;
      base.correctAnswer = { correctIndex: config.correctIndex ?? null };
    } else if (a.type === 'true_false') {
      base.correctAnswer = { correctAnswer: config.correctAnswer ?? null };
    } else if (a.type === 'ordering') {
      base.items = Array.isArray(config.items) ? config.items.map(String) : null;
      base.correctOrder = Array.isArray(config.correctOrder)
        ? config.correctOrder
        : null;
    } else if (a.type === 'matching') {
      base.pairs = Array.isArray(config.pairs)
        ? config.pairs.map((p) => ({
            left: String(p.left ?? ''),
            right: String(p.right ?? '')
          }))
        : null;
    } else if (a.type === 'detective') {
      // correctAnswer para detective: totalSynonyms para scoring
      base.correctAnswer = {
        totalSynonyms: Array.isArray(config.synonyms) ? config.synonyms.length : 0
      };
      // Pasar config al snapshot para el frontend
      base.config = {
        target: config.target,
        synonyms: config.synonyms,
        distractors: config.distractors
      };
    }

    return base;
  });
}