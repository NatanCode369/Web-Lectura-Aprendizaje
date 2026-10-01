export const collection = 'studentAssignments';

export const indexes = [
  {
    key: { assignmentId: 1, studentId: 1 },
    name: 'assignment_student_unique',
    unique: true
  },
  {
    key: { studentId: 1, status: 1, updatedAt: -1 },
    name: 'student_status_updated'
  },
  { key: { assignmentId: 1, status: 1 }, name: 'assignment_status' }
];