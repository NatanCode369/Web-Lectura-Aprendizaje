import { analyticsRepository } from './analytics.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';

function aggregate(rows) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.assignedCount += r.assignedCount ?? 0;
      acc.completedCount += r.completedCount ?? 0;
      acc.scoreSum += (r.averageScore ?? 0) * (r.completedCount ?? 0);
      acc.timeSum += (r.averageTimeSeconds ?? 0) * (r.completedCount ?? 0);
      return acc;
    },
    { assignedCount: 0, completedCount: 0, scoreSum: 0, timeSum: 0 }
  );

  return {
    assignedCount: totals.assignedCount,
    completedCount: totals.completedCount,
    completionRate: totals.assignedCount
      ? Math.round((totals.completedCount / totals.assignedCount) * 100) / 100
      : 0,
    averageScore: totals.completedCount
      ? Math.round((totals.scoreSum / totals.completedCount) * 100) / 100
      : 0,
    averageTimeSeconds: totals.completedCount
      ? Math.round(totals.timeSum / totals.completedCount)
      : 0
  };
}

export const analyticsService = {
  async getGroupAnalytics(user, groupId, { from, to }) {
    const group = await groupsRepository.findByIdForTeacher(
      groupId,
      user.userId
    );
    if (!group) {
      if (user.role === 'admin') {
        const anyGroup = await groupsRepository.findById(groupId);
        if (!anyGroup) throw new NotFoundError('Grupo');
      } else {
        throw new ForbiddenError('Este grupo no te pertenece');
      }
    }
    const rows = await analyticsRepository.findByGroup(groupId, { from, to });
    return {
      groupId,
      from: from ?? null,
      to: to ?? null,
      summary: aggregate(rows),
      rows
    };
  },

  async getReadingAnalytics(user, readingId, { from, to }) {
    const rows = await analyticsRepository.findByAssignment(readingId, {
      from,
      to
    });
    return {
      readingId,
      from: from ?? null,
      to: to ?? null,
      summary: aggregate(rows),
      rows
    };
  }
};