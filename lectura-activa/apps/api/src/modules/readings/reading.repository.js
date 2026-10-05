import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';

const collection = () => getDb().collection('readings');

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function buildReadingRepository() {
  return {
    async create(document) {
      const result = await collection().insertOne(document);
      return collection().findOne({ _id: result.insertedId });
    },

    async findById(id) {
      const _id = toObjectId(id);
      if (!_id) return null;

      return collection().findOne({ _id, deletedAt: { $exists: false } });
    },

    async updateById(id, filter, update) {
      const _id = toObjectId(id);
      if (!_id) return null;

      return collection().findOneAndUpdate(
        { _id, ...filter, deletedAt: { $exists: false } },
        { $set: update },
        { returnDocument: 'after' }
      );
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

      return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
  };
}
