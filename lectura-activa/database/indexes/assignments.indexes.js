export const collection = 'assignments';

export const indexes = [
  { key: { groupId: 1, status: 1, dueAt: 1 }, name: 'group_status_due' },
  { key: { teacherId: 1, createdAt: -1 }, name: 'teacher_created' },
  { key: { readingId: 1, status: 1 }, name: 'reading_status' }
];