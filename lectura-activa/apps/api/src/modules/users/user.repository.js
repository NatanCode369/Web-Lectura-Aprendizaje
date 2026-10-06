import { getDb } from '../../shared/db.js';

const projection = {
  authUserId: 1,
  email: 1,
  fullName: 1,
  role: 1,
  institutionId: 1,
  status: 1
};

export function buildUserRepository() {
  return {
    async findByAuthUserId(authUserId) {
      return getDb().collection('users').findOne(
        { authUserId, deletedAt: { $exists: false } },
        { projection }
      );
    }
  };
}
