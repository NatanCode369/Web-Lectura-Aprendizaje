export const collection = 'groups';

export const indexes = [
  { key: { teacherId: 1, status: 1, updatedAt: -1 }, name: 'teacher_status_updated' },
  { key: { studentIds: 1, status: 1 }, name: 'students_status' },
  { key: { institutionId: 1, status: 1 }, name: 'institution_status' }
];