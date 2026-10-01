import { studentAssignmentsRepository } from './studentAssignments.repository.js';
import { assignmentsRepository } from '../assignments/assignments.repository.js';
import { logger } from '../../shared/logger/index.js';
import { NotFoundError } from '../../shared/errors/index.js';

export const studentAssignmentsService = {
  /**
   * ADR-0003: materializa los studentAssignments para los estudiantes del grupo.
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

    // Enriquecer con datos de la asignación (título, fechas)
    const assignmentIds = items.map((sa) => sa.assignmentId);
    const assignments = await Promise.all(
      assignmentIds.map((id) => assignmentsRepository.findById(id))
    );
    const byId = new Map(
      assignments.filter(Boolean).map((a) => [a._id.toString(), a])
    );

    const enriched = items.map((sa) => {
      const a = byId.get(sa.assignmentId.toString());
      return {
        ...sa,
        assignment: a
          ? {
              _id: a._id,
              readingId: a.readingId,
              availableFrom: a.availableFrom,
              dueAt: a.dueAt,
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
    return sa;
  }
};