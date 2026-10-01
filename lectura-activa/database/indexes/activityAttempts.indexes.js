export const collection = 'activityAttempts';

export const indexes = [
  {
    key: { studentAssignmentId: 1, activityId: 1, submittedAt: -1 },
    name: 'studentAssignment_activity_submitted'
  },
  {
    key: { requestId: 1 },
    name: 'request_id_unique',
    unique: true,
    sparse: true
  },
  {
    key: { studentAssignmentId: 1, attemptNumber: -1 },
    name: 'studentAssignment_attempt_number'
  }
];