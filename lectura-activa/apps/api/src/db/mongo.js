import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

let client;
let database;

export async function connectMongo() {
  if (database) return database;

  client = new MongoClient(env.mongodbUri, {
    appName: 'lectura-activa-api',
    maxPoolSize: 20,
    minPoolSize: 2,
    retryWrites: true,
    serverSelectionTimeoutMS: 5_000
  });

  await client.connect();
  database = client.db(env.mongodbDbName);
  await database.command({ ping: 1 });
  return database;
}

export function getDb() {
  if (!database) throw new Error('MongoDB is not connected');
  return database;
}

export async function closeMongo() {
  database = undefined;
  if (client) await client.close();
  client = undefined;
}
