import { utcDayKey } from '../../shared/utils/dates.js';

export function computeDailyMetrics(studentAssignments) {
  const total = studentAssignments.length;
  const completed = studentAssignments.filter((sa) => sa.status === 'completed');
  const completedCount = completed.length;

  const averageScore = completedCount
    ? completed.reduce((sum, sa) => sum + (sa.score ?? 0), 0) / completedCount
    : 0;

  const averageTimeSeconds = completedCount
    ? completed.reduce((sum, sa) => sum + (sa.timeSpentSeconds ?? 0), 0) /
      completedCount
    : 0;

  return {
    assignedCount: total,
    completedCount,
    averageScore: Math.round(averageScore * 100) / 100,
    averageTimeSeconds: Math.round(averageTimeSeconds)
  };
}

export function dayKey(date = new Date()) {
  return utcDayKey(date);
}