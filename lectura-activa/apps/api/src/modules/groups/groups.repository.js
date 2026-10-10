import { ObjectId } from 'mongodb';
import { getDb } from '../../shared/db.js';

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
  },

  /**
   * Devuelve los estudiantes del grupo con datos mínimos para la UI.
   * Filtra por rol, institución y estado para no exponer usuarios ajenos.
   */
  async findMembers(groupId, institutionId) {
  const _id = new ObjectId(groupId);

  const group = await col().findOne(
    { _id, deletedAt: null },
    { projection: { studentIds: 1, name: 1 } }
  );

  if (!group) return null;

  const studentIds = Array.isArray(group.studentIds) ? group.studentIds : [];
  if (studentIds.length === 0) {
    return { groupId: _id, name: group.name, members: [] };
  }

  const users = await getDb()
    .collection('users')
    .find(
      {
        _id: { $in: studentIds },
        role: 'student',
        institutionId: new ObjectId(institutionId),
        status: 'active',
        deletedAt: null                     // ← CAMBIO AQUÍ
      },
      { projection: { fullName: 1, email: 1 } }
    )
    .toArray();

  return {
    groupId: _id,
    name: group.name,
    members: users.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email
    }))
  };
},

  /**
   * Devuelve los grupos activos en los que el estudiante es miembro.
   * Proyección mínima: solo lo que el estudiante necesita ver.
   */
  async findByStudent(studentId) {
    const _id = new ObjectId(studentId);

    return col()
      .find(
        {
          studentIds: _id,
          status: 'active',
          deletedAt: null
        },
        { projection: { name: 1, schoolYear: 1 } }
      )
      .sort({ updatedAt: -1 })
      .toArray();
  }
};