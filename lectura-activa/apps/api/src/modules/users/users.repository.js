/**
 * Repositorio de usuarios — acceso a MongoDB.
 *
 * Ojo: algunos métodos reciben `institutionId` como ObjectId (no string),
 * porque el servicio ya lo normaliza.
 */

import { ObjectId } from 'mongodb';

function toObjectId(value) {
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
}

export function usersRepo(db) {
  const col = db.collection('users');

  return {
    async findByAuthUserId(authUserId) {
      if (!authUserId) return null;
      return col.findOne({ authUserId, deletedAt: null });
    },

    async findByEmail(email) {
      if (!email) return null;
      return col.findOne({ email: String(email).toLowerCase(), deletedAt: null });
    },

    async findById(id) {
      const _id = toObjectId(id);
      if (!_id) return null;
      return col.findOne({ _id, deletedAt: null });
    },

    async create(doc) {
      // Normaliza institutionId antes de insertar
      const institutionId = toObjectId(doc.institutionId);
      if (!institutionId) {
        throw new Error('institutionId inválido al crear usuario');
      }
      const payload = { ...doc, institutionId };
      const res = await col.insertOne(payload);
      return { ...payload, _id: res.insertedId };
    },

    async updateById(id, patch) {
      const _id = toObjectId(id);
      if (!_id) return null;

      // No permitimos tocar campos sensibles ni el propio _id
      const { _id: _ignored, authUserId, email, role, institutionId, ...safe } = patch;

      const res = await col.findOneAndUpdate(
        { _id, deletedAt: null },
        { $set: { ...safe, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      // Dependiendo de la versión del driver, res puede ser el doc o { value }.
      return res?.value ?? res ?? null;
    },
  };
}