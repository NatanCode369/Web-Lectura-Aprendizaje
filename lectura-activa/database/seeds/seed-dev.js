import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

try {
  await client.connect();
  const database = client.db(databaseName);
  const now = new Date();
  await database.collection('institutions').updateOne(
    { allowedEmailDomains: 'demo.local' },
    {
      $set: {
        name: 'Institución Demo',
        allowedEmailDomains: ['demo.local'],
        settings: {},
        status: 'active',
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  console.log(`Development seed applied to ${databaseName}`);
} finally {
  await client.close();
}
