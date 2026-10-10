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
import { logger } from '../../shared/logger.js';
import { getDb } from '../../shared/db.js';
import { auditService } from '../../shared/audit.service.js';

const readingRepository = buildReadingRepository();
const getAudit = () => auditService(getDb());

export const assignmentsService = {
  async create(user, payload) {
    assertDatesValid(payload.availableFrom, payload.dueAt);

    const [reading, group] = await Promise.all([
      readingRepository.findById(payload.readingId),
      groupsRepository.findByIdForTeacher(payload.groupId, user._id)
    ]);

    if (!group) throw new ForbiddenError('FORBIDDEN', 'El grupo no te pertenece');
    assertReadingPublished(reading);

    const assignment = await assignmentsRepository.create({
      readingId: reading._id,
      readingVersion: reading.version ?? 1,
      groupId: group._id,
      teacherId: user._id,
      availableFrom: new Date(payload.availableFrom),
      dueAt: new Date(payload.dueAt),
      timeLimit: payload.timeLimit ?? null,
      activitySnapshot: buildActivitySnapshot(reading),
      status: 'published'
    });

    await studentAssignmentsService.materializeForGroup(assignment, group);

    await getAudit().log({
      actorId: user._id,
      action: 'assignment.created',
      resourceType: 'assignment',
      resourceId: assignment._id,
      metadata: {
        groupId: group._id.toString(),
        readingId: reading._id.toString(),
        dueAt: assignment.dueAt.toISOString(),
      },
    });

    logger.info(
      {
        assignmentId: assignment._id,
        groupId: group._id,
        teacherId: user._id
      },
      'assignment created'
    );
    return assignment;
  },

  async listForTeacher(user, query) {
    return assignmentsRepository.listForTeacher(user._id, query);
  },

  async getByIdForTeacher(user, id) {
    const assignment = await assignmentsRepository.findByIdForTeacher(id, user._id);
    if (!assignment) throw new NotFoundError('Asignación');
    return assignment;
  },

  async close(user, id) {
    const assignment = await assignmentsRepository.findByIdForTeacher(id, user._id);
    if (!assignment) throw new NotFoundError('Asignación');

    const closed = await assignmentsRepository.updateStatus(id, 'closed');

    await getAudit().log({
      actorId: user._id,
      action: 'assignment.closed',
      resourceType: 'assignment',
      resourceId: assignment._id,
      metadata: {},
    });

    return closed;
  }
};