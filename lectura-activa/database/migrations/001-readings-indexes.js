export async function createReadingIndexes(db) {
  const collection = db.collection('readings');

  await collection.createIndex({ institutionId: 1, status: 1, deletedAt: 1 });
  await collection.createIndex({ institutionId: 1, difficulty: 1 });
  await collection.createIndex({ title: 'text', summary: 'text' });
  await collection.createIndex({ createdAt: -1 });
}