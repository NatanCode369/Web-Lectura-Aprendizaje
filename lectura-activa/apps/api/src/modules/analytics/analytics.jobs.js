import { assignmentsRepository } from '../assignments/assignments.repository.js';
import { studentAssignmentsRepository } from '../studentAssignments/studentAssignments.repository.js';
import { analyticsRepository } from './analytics.repository.js';
import { computeDailyMetrics, dayKey } from './analytics.domain.js';
import { startOfUtcDay, endOfUtcDay } from '../../shared/utils/dates.js';
import { logger } from '../../shared/logger/index.js';

/**
 * ADR-0004: cálculo diario de analítica.
 * Recorre las asignaciones activas, agrega métricas por (date, groupId, assignmentId)
 * y hace upsert idempotente en analyticsDaily.
 */
export async function runDailyAnalytics({ date = new Date() } = {}) {
  const from = startOfUtcDay(date);
  const to = endOfUtcDay(date);
  const dateKey = dayKey(date);

  const assignments = await assignmentsRepository.listActiveBetween(from, to);
  logger.info({ dateKey, count: assignments.length }, 'analytics job start');

  let processed = 0;

  for (const assignment of assignments) {
    const studentAssignments = await studentAssignmentsRepository.listByAssignment(
      assignment._id
    );
    const metrics = computeDailyMetrics(studentAssignments);

    await analyticsRepository.upsertDaily({
      date: dateKey,
      groupId: assignment.groupId,
      assignmentId: assignment._id,
      metrics
    });

    processed += 1;
  }

  logger.info({ dateKey, processed }, 'analytics job done');
  return { dateKey, processed };
}