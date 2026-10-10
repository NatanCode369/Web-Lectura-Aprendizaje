import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB;

const client = new MongoClient(uri);

const collections = [
  'institutions',
  'users',
  'groups',
  'assignments',
  'studentAssignments',
  'activityAttempts',
  'analyticsDaily',
  'readings',
  'auditLogs',
  'passwordResets',
];

try {
  await client.connect();
  const database = client.db(databaseName);
  for (const coll of collections) {
    try {
      await database.createCollection(coll);
      console.log(`Collection created: ${coll}`);
    } catch (error) {
      if (error.codeName === 'NamespaceExists') {
        console.log(`Collection already exists: ${coll}`);
      } else {
        throw error;
      }
    }
  }
  console.log(`All initial collections ensured in ${databaseName}`);
} catch (error) {
  console.error('Migration failed:', error);
  throw error;
} finally {
  await client.close();
}
