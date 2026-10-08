import { assignmentsRepository } from './assignments.repository.js';
import { buildReadingRepository } from '../readings/reading.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { studentAssignmentsService } from '../studentAssignments/studentAssignments.service.js';
import {
  assertReadingPublished,
  assertDatesValid,
  buildActivitySnapshot
} from './assignments.domain.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';

// El módulo de readings exporta una factory; el resto son singletons.
// Instancia única local para no romper el patrón.
const readingRepository = buildReadingRepository();

export const assignmentsService = {
  async create(user, payload) {
    assertDatesValid(payload.availableFrom, payload.dueAt);

    const [reading, group] = await Promise.all([
      readingRepository.findById(payload.readingId),
      groupsRepository.findByIdForTeacher(payload.groupId, user.userId)
    ]);

    if (!group) throw new ForbiddenError('FORBIDDEN', 'El grupo no te pertenece');
    assertReadingPublished(reading);

    const assignment = await assignmentsRepository.create({
      readingId: reading._id,
      readingVersion: reading.version ?? 1,
      groupId: group._id,
      teacherId: user.userId,
      availableFrom: new Date(payload.availableFrom),
      dueAt: new Date(payload.dueAt),
      timeLimit: payload.timeLimit ?? null,
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
    const assignment = await assignmentsRepository.findByIdForTeacher(id, user.userId);
    if (!assignment) throw new NotFoundError('Asignación');
    return assignment;
  },

  async close(user, id) {
    const assignment = await assignmentsRepository.findByIdForTeacher(id, user.userId);
    if (!assignment) throw new NotFoundError('Asignación');
    return assignmentsRepository.updateStatus(id, 'closed');
  }
};