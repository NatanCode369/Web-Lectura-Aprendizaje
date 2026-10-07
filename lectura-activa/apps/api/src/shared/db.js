import 'dotenv/config';
/**
 * Conexión a MongoDB — singleton.
 *
 * El driver oficial mantiene un pool interno de conexiones. Creamos un solo
 * MongoClient por proceso y lo reutilizamos en todos los repositorios.
 */


import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let client = null;
let db = null;


/**
 * Conecta a MongoDB si aún no hay conexión activa.
 * Devuelve la instancia de Db lista para usar.
 */
export async function connectDb() {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI, {
    // El pool se ajusta según el tamaño de Cloud Run.
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  db = client.db(env.MONGODB_DB);

  // Verificación de conexión con ping.
  await db.command({ ping: 1 });
  logger.info({ db: env.MONGODB_DB }, 'MongoDB conectado');

  return db;
}

/**
 * Devuelve la conexión existente. Falla si no se ha inicializado.
 * Útil en repositorios: no deberían abrir conexiones nuevas.
 */
export function getDb() {
  if (!db) {
    throw new Error(
      'MongoDB no está conectado. Llama a connectDb() antes de usar getDb().'
    );
  }
  return db;
}

export function setDbForTests(testDb, testClient = testDb?.client) {
  db = testDb;
  client = testClient ?? null;
}

/**
 * Cierra la conexión. Se llama en el apagado ordenado del servidor.
 */
export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB desconectado');
  }
}

/**
 * Health check para /ready.
 */
export async function pingDb() {
  if (!db) return false;
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}