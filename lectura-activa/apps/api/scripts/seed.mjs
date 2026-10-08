/**
 * Seed de desarrollo — datos mínimos.
 *
 * Crea:
 * - 1 institución (`kinal.edu.gt`).
 * - Whitelist de roles (`admins`, `teachers`).
 *
 * NO crea usuarios ficticios. Los usuarios se crean en el primer login
 * (lazy provisioning, ADR 0001).
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

const DB_NAME = process.env.MONGODB_DB ?? 'lectura-activa';
const now = new Date();

// P1 (07-Oct-2026): dominio oficial es kinal.edu.gt.
const INSTITUTION_ID = new ObjectId();

const institution = {
  _id: INSTITUTION_ID,
  name: 'Kinal',
  allowedEmailDomains: ['kinal.edu.gt'],
  settings: {},
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const admins = [
  'aaguilar-2023146@kinal.edu.gt',   // P1
  'jmazul-2023430@kinal.edu.gt',     // Mazul
];

const teachers = [
  'marbinaquino@kinal.edu.gt',       // Marbin (profesor)
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // ---------- Limpieza de usuarios viejos ----------
  const deleted = await db.collection('users').deleteMany({
    $or: [
      { authUserId: { $regex: '^dev-' } },
      { email: /@colegiodemo\.edu\.gt$/ },
    ],
  });
  console.log(`\n🧹 Limpieza: ${deleted.deletedCount} usuarios viejos eliminados.`);

  // ---------- Limpieza de instituciones viejas ----------
  const deletedInst = await db.collection('institutions').deleteMany({
    name: { $in: ['Colegio Demo Guatemala', 'Institución Demo'] },
  });
  console.log(`🧹 Limpieza: ${deletedInst.deletedCount} instituciones viejas eliminadas.`);

  // ---------- Institución oficial ----------
  await db.collection('institutions').insertOne(institution);
  console.log(`\n✅ Institución creada: ${institution.name}`);
  console.log(`   Dominios autorizados: ${institution.allowedEmailDomains.join(', ')}`);

  // ---------- Whitelist de admins ----------
  await db.collection('admins').deleteMany({});
  await db.collection('admins').insertMany(
    admins.map((email) => ({
      email,
      addedBy: null,
      createdAt: now,
    }))
  );
  console.log(`\n✅ Admins (${admins.length}):`);
  admins.forEach((e) => console.log(`   - ${e}`));

  // ---------- Whitelist de teachers ----------
  await db.collection('teachers').deleteMany({});
  await db.collection('teachers').insertMany(
    teachers.map((email) => ({
      email,
      addedBy: null,
      createdAt: now,
    }))
  );
  console.log(`\n✅ Teachers (${teachers.length}):`);
  teachers.forEach((e) => console.log(`   - ${e}`));

  console.log('\n⚠️  No se crean usuarios ficticios. Los usuarios se crean en el primer login.');
  console.log('   Para probar: regístrate con un correo @kinal.edu.gt.');

  await client.close();
}

main().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});