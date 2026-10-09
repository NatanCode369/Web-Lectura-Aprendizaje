import { ConflictError } from '../../shared/errors/AppError.js';

export const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

export function assertValidStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new ConflictError(`Estado inválido: ${status}`);
  }
}

export function assertCanStart(sa) {
  if (sa.status === 'completed') {
    throw new ConflictError('Esta tarea ya fue completada');
  }
}

export function isAssignmentCompleted(activityProgress, snapshot) {
  if (!Array.isArray(snapshot) || snapshot.length === 0) return true;
  const answeredIds = new Set(
    activityProgress.filter((p) => p.status === 'completed').map((p) => p.activityId)
  );
  return snapshot.every((a) => answeredIds.has(String(a.activityId)));
}

export function mergeActivityProgress(current, incoming) {
  const map = new Map(current.map((p) => [String(p.activityId), p]));
  for (const item of incoming) {
    const key = String(item.activityId);
    const prev = map.get(key);
    if (!prev || (prev.attemptNumber ?? 0) <= (item.attemptNumber ?? 0)) {
      map.set(key, { ...prev, ...item });
    }
  }
  return [...map.values()];
}