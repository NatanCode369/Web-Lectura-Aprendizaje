import { ObjectId } from 'mongodb';
import { getDb } from '../../shared/db.js';

const collection = () => getDb().collection('readings');

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function buildReadingRepository() {
  return {
    async create(document) {
      const result = await collection().insertOne(document);
      return { _id: result.insertedId, ...document };
    },

    async findById(id) {
      const _id = toObjectId(id);
      if (!_id) return null;

      return collection().findOne({ _id, deletedAt: { $exists: false } });
    },

    async findByMediaPath(path) {
      if (!path || typeof path !== 'string') return null;
      const normalized = path.trim();
      if (!normalized) return null;

      return collection().findOne({
        deletedAt: { $exists: false },
        'media.path': normalized,
      });
    },

    async updateById(id, filter, update) {
      const _id = toObjectId(id);
      if (!_id) return null;

      const result = await collection().findOneAndUpdate(
        { _id, ...filter, deletedAt: { $exists: false } },
        { $set: update },
        { returnDocument: 'after' }
      );
      return result.value ?? null;
    },

    async list({ institutionId, search, difficulty, maxMinutes, page, limit }) {
      const filter = {
        institutionId,
        status: 'published',
        deletedAt: { $exists: false },
      };

      if (difficulty) filter.difficulty = difficulty;
      if (maxMinutes !== undefined) filter.estimatedMinutes = { $lte: maxMinutes };

      if (search) {
        filter.$or = [
          { title: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { summary: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ];
      }

      const [data, total] = await Promise.all([
        collection().aggregate([
          { $match: filter },
          { $sort: { updatedAt: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              title: 1,
              summary: 1,
              difficulty: 1,
              estimatedMinutes: 1,
              createdAt: 1,
              updatedAt: 1,
              authorName: 1,
            },
          },
        ]).toArray(),
        collection().countDocuments(filter),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },

    /**
     * Reemplaza el PDF del array `media` y devuelve el documento actualizado.
     * No acumula binarios huérfanos: elimina PDFs previos antes de insertar el nuevo.
     */
    async addMedia(id, mediaItem) {
      const _id = toObjectId(id);
      if (!_id) return null;

      const now = new Date();

      // Quitar PDFs previos del array
      await collection().updateOne(
        { _id, deletedAt: { $exists: false } },
        { $pull: { media: { type: 'pdf' } } }
      );

      // Insertar el nuevo
      const result = await collection().findOneAndUpdate(
        { _id, deletedAt: { $exists: false } },
        {
          $push: { media: mediaItem },
          $set: { updatedAt: now },
        },
        { returnDocument: 'after' }
      );
      return result?.value ?? null;
    },
  };
}