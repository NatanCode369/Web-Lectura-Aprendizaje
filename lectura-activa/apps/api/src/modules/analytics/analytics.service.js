import { analyticsRepository } from './analytics.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';

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

/**
 * ✅ NUEVO: agrega métricas en tiempo real desde studentAssignments.
 * No depende del job diario.
 */
async function computeGroupSummary(groupId) {
  const db = (await import('../../shared/db.js')).getDb();
  const { ObjectId } = await import('mongodb');

  const sa = await db
    .collection('studentAssignments')
    .find({ assignmentId: { $in: [] } }) // placeholder
    .toArray();

  // Buscar assignments del grupo
  const assignments = await db
    .collection('assignments')
    .find({ groupId: new ObjectId(groupId) })
    .toArray();

  if (assignments.length === 0) {
    return {
      assignedCount: 0,
      completedCount: 0,
      completionRate: 0,
      averageScore: 0,
      averageTimeSeconds: 0
    };
  }

  const assignmentIds = assignments.map((a) => a._id);

  const studentAssignments = await db
    .collection('studentAssignments')
    .find({ assignmentId: { $in: assignmentIds } })
    .toArray();

  if (studentAssignments.length === 0) {
    return {
      assignedCount: 0,
      completedCount: 0,
      completionRate: 0,
      averageScore: 0,
      averageTimeSeconds: 0
    };
  }

  const completed = studentAssignments.filter((s) => s.status === 'completed');
  const totalScore = completed.reduce((acc, s) => acc + (s.score ?? 0), 0);
  const totalTime = completed.reduce((acc, s) => acc + (s.timeSpentSeconds ?? 0), 0);

  return {
    assignedCount: studentAssignments.length,
    completedCount: completed.length,
    completionRate:
      studentAssignments.length > 0
        ? Math.round((completed.length / studentAssignments.length) * 100) / 100
        : 0,
    averageScore:
      completed.length > 0
        ? Math.round((totalScore / completed.length) * 100) / 100
        : 0,
    averageTimeSeconds:
      completed.length > 0 ? Math.round(totalTime / completed.length) : 0
  };
}

export const analyticsService = {
  async getGroupAnalytics(user, groupId, { from, to }) {
    const group = await groupsRepository.findByIdForTeacher(groupId, user._id);

    if (!group) {
      if (user.role === 'admin') {
        const anyGroup = await groupsRepository.findById(groupId);
        if (!anyGroup) throw new NotFoundError('Grupo');
      } else {
        throw new ForbiddenError('Este grupo no te pertenece');
      }
    }

    // ✅ FIX: calcular en tiempo real
    const summary = await computeGroupSummary(groupId);
    return {
      groupId,
      from: from ?? null,
      to: to ?? null,
      summary,
      rows: []
    };
  },

  async getReadingAnalytics(user, readingId, { from, to }) {
    const rows = await analyticsRepository.findByAssignment(readingId, { from, to });
    return {
      readingId,
      from: from ?? null,
      to: to ?? null,
      summary: aggregate(rows),
      rows
    };
  },

  /**
   * ✅ NUEVO: resumen agregado de todos los estudiantes del docente.
   */
  async getTeacherSummary(user) {
    const items = await analyticsRepository.summaryByTeacher(user._id);
    return { items };
  },
};