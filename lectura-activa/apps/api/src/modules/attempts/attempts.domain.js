import { ValidationError } from '../../shared/errors/index.js';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Cálculo de puntuación por tipo de actividad. Función pura: sin I/O.
 */
export function scoreAnswer(activity, answers) {
  const { type, correctAnswer, points } = activity;

  // Normalizar tipo: short_answer es alias de short_text
  const normalizedType = type === 'short_answer' ? 'short_text' : type;

  switch (normalizedType) {
    case 'multiple_choice':
    case 'true_false':
      return answers?.choice === correctAnswer ? points : 0;

    case 'short_text':
    case 'short_answer':
    case 'open_text': {
      const given = normalizeText(answers?.text);
      const expected = normalizeText(correctAnswer);
      if (!expected) return 0;
      return given === expected ? points : 0;
    }

    case 'multi_select': {
      const given = new Set(answers?.choices ?? []);
      const expected = new Set(correctAnswer ?? []);
      if (given.size !== expected.size) return 0;
      for (const item of expected) {
        if (!given.has(item)) return 0;
      }
      return points;
    }

    case 'ordering': {
      const given = (answers?.order ?? []).map(String);
      const expected = (correctAnswer ?? []).map(String);
      return JSON.stringify(given) === JSON.stringify(expected) ? points : 0;
    }

    case 'matching': {
      const given = answers?.matches ?? [];
      const expected = correctAnswer ?? [];
      if (given.length !== expected.length) return 0;
      const map = new Map(
        given.map((m) => [String(m.left), String(m.right)])
      );
      for (const pair of expected) {
        if (map.get(String(pair.left)) !== String(pair.right)) return 0;
      }
      return points;
    }

    default:
      throw new ValidationError(
        'VALIDATION_ERROR',
        `Tipo de actividad desconocido: ${type}`
      );
  }
}

export function findActivityInSnapshot(snapshot, activityId) {
  const found = (snapshot ?? []).find(
    (a) => String(a.activityId) === String(activityId)
  );
  if (!found) {
    throw new ValidationError(
      'VALIDATION_ERROR',
      `Actividad ${activityId} no pertenece a esta asignación`
    );
  }
  return found;
}

export function buildProgressEntry(activity, answers, score, attemptNumber) {
  return {
    activityId: String(activity.activityId),
    status: 'completed',
    score,
    maxScore: activity.points,
    attemptNumber,
    submittedAt: new Date()
  };
}

/**
 * Devuelve el snapshot sin campos sensibles (correctAnswer).
 * Se usa en /start para que el estudiante vea las preguntas pero no las respuestas.
 */
export function toPublicSnapshot(snapshot) {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.map((a) => ({
    activityId: String(a.activityId),
    type: a.type,
    prompt: a.prompt,
    options: a.options ?? null,
    items: a.items ?? null,
    pairs: a.pairs ?? null,
    points: a.points,
    order: a.order
    // ⚠️ NO incluir correctAnswer
  }));
}