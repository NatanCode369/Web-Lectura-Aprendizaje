import { studentAssignmentsRepository } from './studentAssignments.repository.js';
import { assignmentsRepository } from '../assignments/assignments.repository.js';
import { readingsRepository } from '../readings/readings.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { logger } from '../../shared/logger/index.js';
import { NotFoundError } from '../../shared/errors/index.js';

export const studentAssignmentsService = {
  /**
   * ADR-0003: materializa studentAssignments para los estudiantes del grupo.
   * Idempotente por el índice único { assignmentId, studentId }.
   */
  async materializeForGroup(assignment, group) {
    const studentIds = Array.isArray(group.studentIds) ? group.studentIds : [];
    if (studentIds.length === 0) return [];

    const results = await Promise.all(
      studentIds.map((studentId) =>
        studentAssignmentsRepository
          .ensure({ assignmentId: assignment._id, studentId })
          .catch((err) => {
            logger.error(
              { err, assignmentId: assignment._id, studentId },
              'failed to materialize studentAssignment'
            );
            return null;
          })
      )
    );
    return results.filter(Boolean);
  },

  async listMine(studentId, query) {
    const { items, total, page, limit } =
      await studentAssignmentsRepository.listByStudent(studentId, query);

    // Cargar asignaciones en batch
    const assignmentIds = [
      ...new Set(items.map((sa) => sa.assignmentId.toString()))
    ];
    const assignments = await Promise.all(
      assignmentIds.map((id) => assignmentsRepository.findById(id))
    );
    const assignmentsById = new Map(
      assignments.filter(Boolean).map((a) => [a._id.toString(), a])
    );

    // Cargar lecturas en batch (una por readingId único)
    const readingIds = [
      ...new Set(
        assignments.filter(Boolean).map((a) => a.readingId.toString())
      )
    ];
    const readings = await Promise.all(
      readingIds.map((id) => readingsRepository.findById(id))
    );
    const readingsById = new Map(
      readings.filter(Boolean).map((r) => [r._id.toString(), r])
    );

    // Cargar grupos en batch (uno por groupId único)
    const groupIds = [
      ...new Set(
        assignments.filter(Boolean).map((a) => a.groupId.toString())
      )
    ];
    const groups = await Promise.all(
      groupIds.map((id) => groupsRepository.findById(id))
    );
    const groupsById = new Map(
      groups.filter(Boolean).map((g) => [g._id.toString(), g])
    );

    const enriched = items.map((sa) => {
      const a = assignmentsById.get(sa.assignmentId.toString());
      const reading = a ? readingsById.get(a.readingId.toString()) : null;
      const group = a ? groupsById.get(a.groupId.toString()) : null;

      return {
        _id: sa._id,
        assignmentId: sa.assignmentId,
        studentId: sa.studentId,
        status: sa.status,
        score: sa.score ?? 0,
        timeSpentSeconds: sa.timeSpentSeconds ?? 0,
        activityProgress: sa.activityProgress ?? [],
        startedAt: sa.startedAt ?? null,
        completedAt: sa.completedAt ?? null,
        createdAt: sa.createdAt,
        updatedAt: sa.updatedAt,
        assignment: a
          ? {
              _id: a._id,
              readingId: a.readingId,
              readingTitle: reading?.title ?? null,
              groupId: a.groupId,
              groupName: group?.name ?? null,
              availableFrom: a.availableFrom,
              dueAt: a.dueAt,
              timeLimitMinutes: a.timeLimitMinutes ?? 20,
              status: a.status
            }
          : null
      };
    });

    return { items: enriched, total, page, limit };
  },

  async getMine(studentId, studentAssignmentId) {
    const sa = await studentAssignmentsRepository.findById(studentAssignmentId);
    if (!sa || sa.studentId.toString() !== studentId) {
      throw new NotFoundError('Tarea');
    }
    const assignment = await assignmentsRepository.findById(sa.assignmentId);
    const reading = assignment
      ? await readingsRepository.findById(assignment.readingId)
      : null;
    const group = assignment
      ? await groupsRepository.findById(assignment.groupId)
      : null;

    return {
      _id: sa._id,
      assignmentId: sa.assignmentId,
      studentId: sa.studentId,
      status: sa.status,
      score: sa.score ?? 0,
      timeSpentSeconds: sa.timeSpentSeconds ?? 0,
      activityProgress: sa.activityProgress ?? [],
      startedAt: sa.startedAt ?? null,
      completedAt: sa.completedAt ?? null,
      createdAt: sa.createdAt,
      updatedAt: sa.updatedAt,
      assignment: assignment
        ? {
            _id: assignment._id,
            readingId: assignment.readingId,
            readingTitle: reading?.title ?? null,
            groupId: assignment.groupId,
            groupName: group?.name ?? null,
            availableFrom: assignment.availableFrom,
            dueAt: assignment.dueAt,
            timeLimitMinutes: assignment.timeLimitMinutes ?? 20,
            status: assignment.status
          }
        : null
    };
  }
};