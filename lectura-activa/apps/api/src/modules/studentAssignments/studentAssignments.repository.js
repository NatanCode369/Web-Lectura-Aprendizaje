import { ObjectId } from 'mongodb';
import { getDb } from '../../shared/db.js';

const COLLECTION = 'studentAssignments';

function col() {
  return getDb().collection(COLLECTION);
}

export const studentAssignmentsRepository = {
  async ensure({ assignmentId, studentId }) {
    const now = new Date();
    const result = await col().findOneAndUpdate(
      {
        assignmentId: new ObjectId(assignmentId),
        studentId: new ObjectId(studentId)
      },
      {
        $setOnInsert: {
          assignmentId: new ObjectId(assignmentId),
          studentId: new ObjectId(studentId),
          status: 'pending',
          score: 0,
          timeSpentSeconds: 0,
          activityProgress: [],
          createdAt: now
        },
        $set: { updatedAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result.value ?? result;
  },

  async findById(id) {
    return col().findOne({ _id: new ObjectId(id) });
  },

  async findByAssignmentAndStudent(assignmentId, studentId) {
    return col().findOne({
      assignmentId: new ObjectId(assignmentId),
      studentId: new ObjectId(studentId)
    });
  },

  async listByStudent(studentId, { status, page = 1, limit = 20 }) {
    const filter = { studentId: new ObjectId(studentId) };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      col()
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col().countDocuments(filter)
    ]);
    return { items, total, page, limit };
  },

  async listByAssignment(assignmentId) {
    return col()
      .find({ assignmentId: new ObjectId(assignmentId) })
      .toArray();
  },

  async start(id) {
    const now = new Date();
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(id), status: 'pending' },
      { $set: { status: 'in_progress', startedAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    return result.value ?? result;
  },

  async applyAttemptResult(id, { activityProgress, addScore, addTime, completed }) {
    const now = new Date();
    const set = { updatedAt: now };
    if (completed) {
      set.status = 'completed';
      set.completedAt = now;
    }
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: { ...set, activityProgress },
        $inc: { score: addScore, timeSpentSeconds: addTime }
      },
      { returnDocument: 'after' }
    );
    return result.value ?? result;
  }
};