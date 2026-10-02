import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB || 'lectura_activa';

const client = new MongoClient(uri);

try {
  await client.connect();
  const database = client.db(databaseName);
  await database.createCollection('institutions');
  await database.createCollection('users');
  console.log(`Initial collections ensured in ${databaseName}`);
} catch (error) {
  if (error.codeName === 'NamespaceExists') {
    console.log(`Initial collections already exist in ${databaseName}`);
  } else {
    throw error;
  }
} finally {
  await client.close();
}