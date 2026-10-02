import { ObjectId } from 'mongodb';
import { getDb } from '../../config/db.js';

const COLLECTION = 'analyticsDaily';

function col() {
  return getDb().collection(COLLECTION);
}

export const analyticsRepository = {
  async upsertDaily({ date, groupId, assignmentId, metrics }) {
    const now = new Date();
    const result = await col().findOneAndUpdate(
      {
        date,
        groupId: new ObjectId(groupId),
        assignmentId: new ObjectId(assignmentId)
      },
      {
        $set: {
          ...metrics,
          date,
          groupId: new ObjectId(groupId),
          assignmentId: new ObjectId(assignmentId),
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result.value ?? result;
  },

  async findByGroup(groupId, { from, to }) {
    const filter = { groupId: new ObjectId(groupId) };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    return col().find(filter).sort({ date: -1 }).toArray();
  },

  async findByAssignment(assignmentId, { from, to }) {
    const filter = { assignmentId: new ObjectId(assignmentId) };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    return col().find(filter).sort({ date: -1 }).toArray();
  }
};