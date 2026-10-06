import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) throw new Error('MONGODB_URI and MONGODB_DB are required');

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(dbName);
  await db.collection('readings').createIndexes([
    { key: { institutionId: 1, status: 1, difficulty: 1 }, name: 'readings_catalog' },
    { key: { authorId: 1, updatedAt: -1 }, name: 'readings_author_updated' }
  ]);
  await db.collection('auditLogs').createIndex({ resourceType: 1, resourceId: 1, createdAt: -1 }, { name: 'audit_resource' });
  console.log('Reading indexes created');
} finally {
  await client.close();
}
