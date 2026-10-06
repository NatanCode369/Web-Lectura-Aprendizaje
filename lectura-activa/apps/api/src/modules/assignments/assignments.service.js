import { assignmentsRepository } from './assignments.repository.js';
import { readingsRepository } from '../readings/readings.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { studentAssignmentsService } from '../studentAssignments/studentAssignments.service.js';
import {
  assertReadingPublished,
  assertDatesValid,
  buildActivitySnapshot
} from './assignments.domain.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';

export const assignmentsService = {
  async create(user, payload) {
    assertDatesValid(payload.availableFrom, payload.dueAt);

    const [reading, group] = await Promise.all([
      readingsRepository.findById(payload.readingId),
      groupsRepository.findByIdForTeacher(payload.groupId, user.userId)
    ]);

    if (!group) throw new ForbiddenError('El grupo no te pertenece');
    assertReadingPublished(reading);

    const assignment = await assignmentsRepository.create({
      readingId: reading._id,
      readingVersion: reading.version ?? 1,
      groupId: group._id,
      teacherId: user.userId,
      availableFrom: new Date(payload.availableFrom),
      dueAt: new Date(payload.dueAt),
      timeLimitMinutes: payload.timeLimitMinutes ?? 20,
      activitySnapshot: buildActivitySnapshot(reading),
      status: 'published'
    });

    await studentAssignmentsService.materializeForGroup(assignment, group);

    logger.info(
      {
        assignmentId: assignment._id,
        groupId: group._id,
        teacherId: user.userId
      },
      'assignment created'
    );
    return assignment;
  },

  async listForTeacher(user, query) {
    return assignmentsRepository.listForTeacher(user.userId, query);
  },

  async getByIdForTeacher(user, id) {
    const assignment = await assignmentsRepository.findByIdForTeacher(
      id,
      user.userId
    );
    if (!assignment) throw new NotFoundError('Asignación');
    return assignment;
  },

  async close(user, id) {
    const assignment = await assignmentsRepository.findByIdForTeacher(
      id,
      user.userId
    );
    if (!assignment) throw new NotFoundError('Asignación');
    return assignmentsRepository.updateStatus(id, 'closed');
  }
};