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
  await ensureCollection(db, 'users', {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'authUserId',
        'email',
        'role',
        'institutionId',
        'status',
        'createdAt',
        'updatedAt',
      ],
      properties: {
        _id: { bsonType: 'objectId' },
        authUserId: { bsonType: 'string', minLength: 1 },
        email: {
          bsonType: 'string',
          pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        },
        fullName: { bsonType: ['string', 'null'], maxLength: 120 },
        role: { enum: ['student', 'teacher', 'admin'] },
        institutionId: { bsonType: 'objectId' },
        status: { enum: ['active', 'suspended', 'deleted'] },
        profile: {
          bsonType: 'object',
          properties: {
            avatarUrl: { bsonType: ['string', 'null'], maxLength: 500 },
            preferences: { bsonType: 'object' },
          },
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        deletedAt: { bsonType: ['date', 'null'] },
      },
      additionalProperties: false,
    },
  });

  await ensureIndexes(db, 'users', [
    {
      keys: { authUserId: 1 },
      options: { unique: true, name: 'uniq_authUserId' },
    },
    {
      keys: { email: 1 },
      options: { unique: true, name: 'uniq_email' },
    },
    {
      keys: { institutionId: 1, role: 1 },
      options: { name: 'by_institution_role' },
    },
    {
      keys: { status: 1, updatedAt: -1 },
      options: { name: 'by_status_recent' },
    },
  ]);

  await client.close();
  console.log('\n✅ Migración completada.');
}

main().catch((err) => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});