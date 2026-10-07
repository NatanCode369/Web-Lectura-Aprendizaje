/**
 * Seed de desarrollo — datos ficticios. NUNCA datos reales.
 *
 * Ejecutar desde apps/api/:
 *   node scripts/seed.mjs
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Falta MONGODB_URI en el entorno.');
  process.exit(1);
}

const DB_NAME = process.env.MONGODB_DB ?? 'lectura_activa';
const now = new Date();

const INSTITUTION_ID = new ObjectId();

const institution = {
  _id: INSTITUTION_ID,
  name: 'Colegio Demo Guatemala',
  allowedEmailDomains: ['colegiodemo.edu.gt'],
  settings: {},
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const users = [
  {
    _id: new ObjectId(),
    authUserId: 'dev-admin-0001',
    email: 'admin@colegiodemo.edu.gt',
    fullName: 'Admin Demo',
    role: 'admin',
    institutionId: INSTITUTION_ID,
    status: 'active',
    profile: { avatarUrl: null, preferences: {} },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    _id: new ObjectId(),
    authUserId: 'dev-teacher-0001',
    email: 'docente@colegiodemo.edu.gt',
    fullName: 'Docente Demo',
    role: 'teacher',
    institutionId: INSTITUTION_ID,
    status: 'active',
    profile: { avatarUrl: null, preferences: {} },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    _id: new ObjectId(),
    authUserId: 'dev-student-0001',
    email: 'estudiante1@colegiodemo.edu.gt',
    fullName: 'Estudiante Uno',
    role: 'student',
    institutionId: INSTITUTION_ID,
    status: 'active',
    profile: { avatarUrl: null, preferences: {} },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    _id: new ObjectId(),
    authUserId: 'dev-student-0002',
    email: 'estudiante2@colegiodemo.edu.gt',
    fullName: 'Estudiante Dos',
    role: 'student',
    institutionId: INSTITUTION_ID,
    status: 'active',
    profile: { avatarUrl: null, preferences: {} },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // Limpieza idempotente
  await db.collection('users').deleteMany({ authUserId: /^dev-/ });
  await db.collection('institutions').deleteOne({ name: institution.name });

  await db.collection('institutions').insertOne(institution);
  await db.collection('users').insertMany(users);

  console.log('\n✅ Seed completado.');
  console.log(`  Institución: ${institution.name}`);
  console.log(`  Usuarios: ${users.length}\n`);
  console.log('Credenciales ficticias (authUserId):');
  users.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}  →  ${u.authUserId}`));

  await client.close();
}

main().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});