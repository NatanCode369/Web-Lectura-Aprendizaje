import { ObjectId } from 'mongodb';
import { getDb } from '../../config/db.js';

const COLLECTION = 'groups';

function col() {
  return getDb().collection(COLLECTION);
}

export const groupsRepository = {
  async create(doc) {
    const now = new Date();
    const full = { ...doc, createdAt: now, updatedAt: now, deletedAt: null };
    const { insertedId } = await col().insertOne(full);
    return { ...full, _id: insertedId };
  },

  async findById(id) {
    return col().findOne({ _id: new ObjectId(id), deletedAt: null });
  },

  async findByIdForTeacher(id, teacherId) {
    return col().findOne({
      _id: new ObjectId(id),
      teacherId: new ObjectId(teacherId),
      deletedAt: null
    });
  },

  async listByTeacher(teacherId, { status, page, limit }) {
    const filter = { teacherId: new ObjectId(teacherId), deletedAt: null };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      col()
        .find(filter, { projection: { studentIds: 0 } })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col().countDocuments(filter)
    ]);
    return { items, total, page, limit };
  },

  async update(id, patch) {
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(id), deletedAt: null },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result.value ?? result;
  },

  async softDelete(id) {
    return col().updateOne(
      { _id: new ObjectId(id), deletedAt: null },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } }
    );
  },

  async addStudents(id, studentIds) {
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(id), deletedAt: null },
      {
        $addToSet: {
          studentIds: { $each: studentIds.map((s) => new ObjectId(s)) }
        },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    return result.value ?? result;
  },

  async removeStudent(id, studentId) {
    const result = await col().findOneAndUpdate(
      { _id: new ObjectId(id), deletedAt: null },
      {
        $pull: { studentIds: new ObjectId(studentId) },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    return result.value ?? result;
  }
};