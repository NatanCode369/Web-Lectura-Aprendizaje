import { attemptsRepository } from './attempts.repository.js';
import { studentAssignmentsRepository } from '../studentAssignments/studentAssignments.repository.js';
import { assignmentsRepository } from '../assignments/assignments.repository.js';
import {
  mergeActivityProgress,
  isAssignmentCompleted
} from '../studentAssignments/studentAssignments.domain.js';
import {
  scoreAnswer,
  findActivityInSnapshot,
  buildProgressEntry,
  toPublicSnapshot
} from './attempts.domain.js';
import { assertAssignmentIsOpen } from '../assignments/assignments.domain.js';
import { getDb } from '../../config/db.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';

async function loadContext(user, assignmentId) {
  const assignment = await assignmentsRepository.findById(assignmentId);
  if (!assignment) throw new NotFoundError('Asignación');

  const sa = await studentAssignmentsRepository.findByAssignmentAndStudent(
    assignmentId,
    user.userId
  );
  return { assignment, sa };
}

export const attemptsService = {
  /**
   * POST /assignments/:id/start
   * Abre la tarea del estudiante. Devuelve snapshot público (sin correctAnswer).
   */
  async start(user, assignmentId, { requestId }) {
    const { assignment, sa } = await loadContext(user, assignmentId);
    assertAssignmentIsOpen(assignment);

    let studentAssignment = sa;
    if (!studentAssignment) {
      studentAssignment = await studentAssignmentsRepository.ensure({
        assignmentId: assignment._id,
        studentId: user.userId
      });
    }

    if (studentAssignment.status === 'pending') {
      studentAssignment = await studentAssignmentsRepository.start(
        studentAssignment._id
      );
    }

    return {
      requestId,
      studentAssignment,
      activitySnapshot: toPublicSnapshot(assignment.activitySnapshot),
      dueAt: assignment.dueAt,
      availableFrom: assignment.availableFrom,
      timeLimitMinutes: assignment.timeLimitMinutes ?? 20
    };
  },

  /**
   * POST /assignments/:id/attempts
   * Idempotente por requestId. Transacción Atlas.
   */
  async submit(user, assignmentId, payload) {
    const { assignment, sa } = await loadContext(user, assignmentId);
    assertAssignmentIsOpen(assignment);

    if (!sa) throw new ForbiddenError('No tienes esta tarea asignada');
    if (sa.status === 'completed') {
      throw new ConflictError('Esta tarea ya fue completada');
    }

    const existing = await attemptsRepository.findByRequestId(payload.requestId);
    if (existing) {
      logger.info({ requestId: payload.requestId }, 'attempt deduplicated');
      return { deduplicated: true, attempt: existing };
    }

    const activity = findActivityInSnapshot(
      assignment.activitySnapshot,
      payload.activityId
    );

    const score = scoreAnswer(activity, payload.answers);
    const attemptNumber = await attemptsRepository.nextAttemptNumber(
      sa._id,
      activity.activityId
    );

    const attemptDoc = {
      studentAssignmentId: sa._id,
      assignmentId: assignment._id,
      activityId: String(activity.activityId),
      attemptNumber,
      requestId: payload.requestId,
      answers: payload.answers,
      score,
      maxScore: activity.points,
      timeSpentSeconds: payload.timeSpentSeconds,
      submittedAt: new Date()
    };

    const db = getDb();
    const client = db.client;
    const session = client.startSession();

    let savedAttempt;
    let updatedSA;

    try {
      await session.withTransaction(async () => {
        savedAttempt = await attemptsRepository.insert(attemptDoc, session);

        const progressEntry = buildProgressEntry(
          activity,
          payload.answers,
          score,
          attemptNumber
        );
        const mergedProgress = mergeActivityProgress(
          sa.activityProgress ?? [],
          [progressEntry]
        );
        const completed = isAssignmentCompleted(
          mergedProgress,
          assignment.activitySnapshot
        );

        updatedSA = await studentAssignmentsRepository.applyAttemptResult(
          sa._id,
          {
            activityProgress: mergedProgress,
            addScore: score,
            addTime: payload.timeSpentSeconds,
            completed
          }
        );
      });
    } finally {
      await session.endSession();
    }

    logger.info(
      {
        assignmentId: assignment._id,
        studentAssignmentId: sa._id,
        activityId: activity.activityId,
        score
      },
      'attempt submitted'
    );

    return {
      deduplicated: false,
      attempt: savedAttempt,
      studentAssignment: updatedSA
    };
  }
};