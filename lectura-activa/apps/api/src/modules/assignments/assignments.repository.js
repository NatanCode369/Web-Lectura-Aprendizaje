import { ObjectId } from 'mongodb';
import { getDb } from '../../config/db.js';

const COLLECTION = 'assignments';

function col() {
  return getDb().collection(COLLECTION);
}

export const assignmentsRepository = {
  async create(doc) {
    const now = new Date();
    const full = { ...doc, createdAt: now, updatedAt: now };
    const { insertedId } = await col().insertOne(full);
    return { ...full, _id: insertedId };
  },

  async findById(id) {
    return col().findOne({ _id: new ObjectId(id) });
  },

  async findByIdForTeacher(id, teacherId) {
    return col().findOne({
      _id: new ObjectId(id),
      teacherId: new ObjectId(teacherId)
    });
  },

  async listForTeacher(teacherId, { groupId, status, page, limit }) {
    const filter = { teacherId: new ObjectId(teacherId) };
    if (groupId) filter.groupId = new ObjectId(groupId);
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      col()
        .find(filter, { projection: { activitySnapshot: 0 } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col().countDocuments(filter)
    ]);
    return { items, total, page, limit };
  },

  async listForGroup(groupId, status = 'published') {
    return col()
      .find({ groupId: new ObjectId(groupId), status })
      .sort({ dueAt: 1 })
      .toArray();
  },

  async listActiveBetween(from, to) {
    return col()
      .find({
        status: 'published',
        availableFrom: { $lte: to },
        dueAt: { $gte: from }
      })
      .toArray();
  },

  async updateStatus(id, status) {
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result.value ?? result;
  }
};