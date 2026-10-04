import { ObjectId } from 'mongodb';
import { getDb } from '../../shared/db.js';

const COLLECTION = 'activityAttempts';

function col() {
  return getDb().collection(COLLECTION);
}

export const attemptsRepository = {
  async insert(doc, session = undefined) {
    const options = session ? { session } : {};
    const { insertedId } = await col().insertOne(doc, options);
    return { ...doc, _id: insertedId };
  },

  async findByRequestId(requestId) {
    return col().findOne({ requestId });
  },

  async nextAttemptNumber(studentAssignmentId, activityId) {
    const last = await col()
      .find({ studentAssignmentId: new ObjectId(studentAssignmentId), activityId })
      .sort({ attemptNumber: -1 })
      .limit(1)
      .next();
    return (last?.attemptNumber ?? 0) + 1;
  },

  async listByStudentAssignment(studentAssignmentId) {
    return col()
      .find({ studentAssignmentId: new ObjectId(studentAssignmentId) })
      .sort({ submittedAt: -1 })
      .toArray();
  }
};