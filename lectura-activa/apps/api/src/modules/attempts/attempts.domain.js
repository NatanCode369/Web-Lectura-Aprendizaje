import { AppError } from '../../shared/errors/AppError.js';

/**
 * Cálculo de puntuación por tipo de actividad. Función pura: sin I/O.
 * Cada actividad tiene un `type` y su `correctAnswer` en el snapshot.
 * Alias: short_answer === short_text (compatibilidad frontend)
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
    case 'open_text': {
      const given = String(answers?.text ?? '').trim().toLowerCase();
      const expected = String(correctAnswer ?? '').trim().toLowerCase();
      if (!expected) return 0; // revisión manual, no auto-puntúa
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

    default:
      throw AppError.badRequest('VALIDATION_ERROR', `Tipo de actividad desconocido: ${type}`);
  }
}

export function findActivityInSnapshot(snapshot, activityId) {
  const found = (snapshot ?? []).find(
    (a) => String(a.activityId) === String(activityId)
  );
  if (!found) {
    throw AppError.badRequest('VALIDATION_ERROR', `Actividad ${activityId} no pertenece a esta asignación`);
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