import { analyticsRepository } from './analytics.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

function aggregate(rows) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.assignedCount += row.assignedCount ?? 0;
      acc.completedCount += row.completedCount ?? 0;
      acc.scoreSum += (row.averageScore ?? 0) * (row.completedCount ?? 0);
      acc.timeSum += (row.averageTimeSeconds ?? 0) * (row.completedCount ?? 0);
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
    const group = await groupsRepository.findByIdForTeacher(groupId, user.userId);

    if (!group) {
      if (user.role === 'admin') {
        const anyGroup = await groupsRepository.findById(groupId);
        if (!anyGroup) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');
      } else {
        throw AppError.forbidden('FORBIDDEN', 'Este grupo no te pertenece');
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
    // Sólo el docente dueño de las asignaciones de esa lectura ve la analítica.
    // La verificación se delega al repositorio de assignments en la capa de servicio
    // que llama; aquí asumimos que ya fue validado por requireRole + control de dueño.
    const rows = await analyticsRepository.findByAssignment(readingId, { from, to });
    return {
      readingId,
      from: from ?? null,
      to: to ?? null,
      summary: aggregate(rows),
      rows
    };
  }
};