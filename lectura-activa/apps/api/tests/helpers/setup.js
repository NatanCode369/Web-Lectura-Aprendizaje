import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

let mongod;
let client;
let db;

/**
 * Levanta un MongoDB en memoria, conecta el `getDb()` del proyecto,
 * y expone utilidades para sembrar y limpiar entre tests.
 */
export async function setupTestDb() {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Sobrescribir env antes de importar el módulo que lo consume
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = 'lectura-activa-test';
    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';

    client = new MongoClient(uri);
    await client.connect();
    db = client.db('lectura-activa-test');

    const dbModule = await import('../../src/shared/db.js');
    // Forzamos la conexión a la instancia de prueba
    //dbModule.getDb = () => db;
    await dbModule.connectDb().catch(() => null);
  });

  afterAll(async () => {
    if (client) await client.close();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    const collections = await db.listCollections().toArray();
    for (const c of collections) {
      await db.collection(c.name).deleteMany({});
    }
  });

  return {
    getDb: () => db,
    getClient: () => client
  };
}

/**
 * Construye un usuario simulado para `request.user` sin pasar por Supabase.
 */
export function fakeUser(overrides = {}) {
  return {
    userId: new ObjectId().toString(),
    authUserId: 'auth-' + new ObjectId().toString(),
    email: 'user@test.edu',
    role: 'teacher',
    institutionId: new ObjectId().toString(),
    ...overrides
  };
}

/**
 * Inserta directamente en la colección para preparar escenarios.
 */
export async function seed(db, collection, docs) {
  const now = new Date();
  const prepared = docs.map((d) => ({
    _id: d._id ?? new ObjectId(),
    createdAt: d.createdAt ?? now,
    updatedAt: d.updatedAt ?? now,
    ...d
  }));
  await db.collection(collection).insertMany(prepared);
  return prepared;
}

/**
 * Construye un objeto Fastify con las rutas montadas y un `requireSession`
 * que inyecta un usuario simulado. Útil para tests de autorización sin JWT real.
 */
export async function buildTestApp(fastify, { user, routes }) {
  fastify.decorateRequest('user', null);
  fastify.addHook('onRequest', async (req) => {
    if (user) req.user = user;
  });
  await fastify.register(routes, { prefix: '/api/v1' });
  await fastify.ready();
  return fastify;
}