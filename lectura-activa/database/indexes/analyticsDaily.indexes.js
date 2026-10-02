export const collection = 'analyticsDaily';

export const indexes = [
  {
    key: { date: 1, groupId: 1, assignmentId: 1 },
    name: 'date_group_assignment_unique',
    unique: true
  },
  { key: { groupId: 1, date: -1 }, name: 'group_date' },
  { key: { assignmentId: 1, date: -1 }, name: 'assignment_date' }
];