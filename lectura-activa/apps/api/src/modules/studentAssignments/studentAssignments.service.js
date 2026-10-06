import { studentAssignmentsRepository } from './studentAssignments.repository.js';
import { assignmentsRepository } from '../assignments/assignments.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { readingsRepository } from '../readings/readings.repository.js';
import { logger } from '../../shared/logger/index.js';
import { AppError } from '../../shared/errors/AppError.js';

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

    // Enriquecer con datos de la asignación, lectura y grupo
    const assignmentIds = items.map((sa) => sa.assignmentId);
    const assignments = await Promise.all(
      assignmentIds.map((id) => assignmentsRepository.findById(id))
    );
    const byId = new Map(
      assignments.filter(Boolean).map((a) => [a._id.toString(), a])
    );

    // Obtener readingIds y groupIds únicos para fetch en batch
    const readingIds = [...new Set(assignments.filter(Boolean).map((a) => a.readingId?.toString()).filter(Boolean))];
    const groupIds = [...new Set(assignments.filter(Boolean).map((a) => a.groupId?.toString()).filter(Boolean))];

    const [readings, groups] = await Promise.all([
      Promise.all(readingIds.map((id) => readingsRepository.findById(id))),
      Promise.all(groupIds.map((id) => groupsRepository.findById(id)))
    ]);

    const readingById = new Map(
      readings.filter(Boolean).map((r) => [r._id.toString(), r.title])
    );
    const groupById = new Map(
      groups.filter(Boolean).map((g) => [g._id.toString(), g.name])
    );

    const enriched = items.map((sa) => {
      const a = byId.get(sa.assignmentId.toString());
      const readingTitle = a?.readingId ? readingById.get(a.readingId.toString()) : null;
      const groupName = a?.groupId ? groupById.get(a.groupId.toString()) : null;
      return {
        ...sa,
        readingTitle,
        groupName,
        completedAt: sa.completedAt ?? null,
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
      throw AppError.notFound('NOT_FOUND', 'Tarea no encontrada');
    }

    // Enriquecer con assignment, readingTitle, groupName
    let assignment = null;
    let readingTitle = null;
    let groupName = null;

    if (sa.assignmentId) {
      assignment = await assignmentsRepository.findById(sa.assignmentId);
      if (assignment) {
        if (assignment.readingId) {
          const reading = await readingsRepository.findById(assignment.readingId);
          readingTitle = reading?.title ?? null;
        }
        if (assignment.groupId) {
          const group = await groupsRepository.findById(assignment.groupId);
          groupName = group?.name ?? null;
        }
      }
    }

    return {
      ...sa,
      readingTitle,
      groupName,
      assignment: assignment
        ? {
            _id: assignment._id,
            readingId: assignment.readingId,
            availableFrom: assignment.availableFrom,
            dueAt: assignment.dueAt,
            status: assignment.status
          }
        : null
    };
  }
};