/**
 * Migración 0001 — Colecciones iniciales con validadores JSON Schema e índices.
 *
 * Ejecutar desde apps/api/ (donde está mongodb y .env):
 *   node scripts/migrate.mjs
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Falta MONGODB_URI en el entorno.');
  process.exit(1);
}

const DB_NAME = process.env.MONGODB_DB ?? 'lectura_activa';

async function ensureCollection(db, name, validator) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, {
      validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    console.log(`✔ Colección creada: ${name}`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    console.log(`↻ Validador actualizado: ${name}`);
  }
}

async function ensureIndexes(db, name, indexes) {
  for (const idx of indexes) {
    await db.collection(name).createIndex(idx.keys, idx.options);
    console.log(`  ✔ Índice ${idx.options.name} en ${name}`);
  }
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // ---------- institutions ----------
  await ensureCollection(db, 'institutions', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'allowedEmailDomains', 'createdAt', 'updatedAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string', minLength: 2, maxLength: 120 },
        allowedEmailDomains: {
          bsonType: 'array',
          minItems: 1,
          items: {
            bsonType: 'string',
            pattern: '^[a-z0-9.-]+\\.[a-z]{2,}$',
          },
        },
        settings: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        deletedAt: { bsonType: ['date', 'null'] },
      },
      additionalProperties: false,
    },
  });

  await ensureIndexes(db, 'institutions', [
    {
      keys: { allowedEmailDomains: 1 },
      options: { name: 'by_allowed_domain' },
    },
    {
      keys: { name: 1 },
      options: { unique: true, name: 'uniq_institution_name' },
    },
  ]);

  // ---------- users ----------
  // ---------- passwordResets ----------
  await ensureCollection(db, 'passwordResets', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'tokenHash', 'expiresAt', 'usedAt', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        email: { bsonType: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
        tokenHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
        expiresAt: { bsonType: 'date' },
        usedAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
        requestIp: { bsonType: ['string', 'null'] },
      },
      additionalProperties: false,
    },
  });

  await ensureIndexes(db, 'passwordResets', [
    {
      keys: { tokenHash: 1 },
      options: { unique: true, name: 'uniq_tokenHash' },
    },
    {
      keys: { email: 1, createdAt: -1 },
      options: { name: 'by_email_recent' },
    },
  ]);

  // TTL: borra automáticamente tokens expirados.
  await db
    .collection('passwordResets')
    .createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'ttl_expiresAt' }
    );
  console.log('  ✔ TTL index ttl_expiresAt en passwordResets');

  // ---------- admins ----------
  await ensureCollection(db, 'admins', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        email: {
          bsonType: 'string',
          pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        },
        addedBy: { bsonType: ['objectId', 'null'] },
        createdAt: { bsonType: 'date' },
      },
      additionalProperties: false,
    },
  });

  await ensureIndexes(db, 'admins', [
    {
      keys: { email: 1 },
      options: { unique: true, name: 'uniq_email' },
    },
  ]);

  // ---------- teachers ----------
  await ensureCollection(db, 'teachers', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        email: {
          bsonType: 'string',
          pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        },
        addedBy: { bsonType: ['objectId', 'null'] },
        createdAt: { bsonType: 'date' },
      },
      additionalProperties: false,
    },
  });

  await ensureIndexes(db, 'teachers', [
    {
      keys: { email: 1 },
      options: { unique: true, name: 'uniq_email' },
    },
  ]);

  await client.close();
  console.log('\n✅ Migración completada.');
}

main().catch((err) => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});