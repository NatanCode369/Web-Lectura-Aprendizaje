#!/usr/bin/env node

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const bucket = process.env.READING_IMPORT_BUCKET ?? 'readings';
const institutionIdRaw = process.env.READING_IMPORT_INSTITUTION_ID ?? process.env.IMPORT_INSTITUTION_ID ?? null;
const authorIdRaw = process.env.READING_IMPORT_AUTHOR_ID ?? process.env.IMPORT_AUTHOR_ID ?? null;
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? 'lectura-activa';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_KEY ?? null;

if (!mongoUri || !mongoDbName) {
  throw new Error('Faltan MONGODB_URI o MONGODB_DB en el entorno.');
}

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
}

if (!dryRun && (!institutionIdRaw || !authorIdRaw)) {
  throw new Error('Faltan READING_IMPORT_INSTITUTION_ID o READING_IMPORT_AUTHOR_ID en el entorno para insertar registros.');
}

function normalizeStoragePath(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function toObjectId(value, label) {
  if (!value || !ObjectId.isValid(value)) {
    throw new Error(`El valor para ${label} no es un ObjectId válido.`);
  }
  return new ObjectId(value);
}

function getDifficultyFromPath(path) {
  const normalized = normalizeStoragePath(path);
  const folder = normalized.split('/')[0] ?? '';

  if (folder === 'short-readings') return 'easy';
  if (folder === 'medium-length-readings') return 'medium';
  if (folder === 'advanced-readings') return 'hard';

  return 'medium';
}

function getEstimatedMinutesByDifficulty(difficulty) {
  return {
    easy: 15,
    medium: 25,
    hard: 40,
  }[difficulty] ?? 25;
}

function fileNameToTitle(fileName) {
  const base = fileName.replace(/\.pdf$/i, '');
  const readable = base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return readable
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Lectura importada';
}

async function listFilesRecursive(supabase, folder = '') {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    throw new Error(`No se pudo listar el bucket ${bucket} en ${folder}: ${error.message}`);
  }

  const results = [];
  for (const entry of data ?? []) {
    const fullPath = folder ? `${folder}/${entry.name}` : entry.name;
    const isFolder = entry?.id === null || entry?.metadata === null || entry?.metadata === undefined;

    if (isFolder) {
      const nested = await listFilesRecursive(supabase, fullPath);
      results.push(...nested);
      continue;
    }

    if (entry?.name && entry.name.toLowerCase().endsWith('.pdf')) {
      results.push(fullPath);
    }
  }

  return results;
}

function buildReadingDocument(path, institutionId, authorId) {
  const normalizedPath = normalizeStoragePath(path);
  const difficulty = getDifficultyFromPath(normalizedPath);
  const title = fileNameToTitle(normalizedPath.split('/').at(-1) ?? 'lectura');
  const estimatedMinutes = getEstimatedMinutesByDifficulty(difficulty);
  const now = new Date();

  return {
    institutionId,
    authorId,
    title,
    summary: `Lectura importada desde Supabase: ${title}`,
    content: `Lectura importada automáticamente desde el bucket ${bucket}. Ruta canónica: ${normalizedPath}`,
    difficulty,
    estimatedMinutes,
    media: [{
      type: 'pdf',
      path: normalizedPath,
      alt: `${title}.pdf`,
    }],
    activities: [],
    status: 'published',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false },
  });

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(mongoDbName);
  const readings = db.collection('readings');

  const institutionId = dryRun ? null : toObjectId(institutionIdRaw, 'institutionId');
  const authorId = dryRun ? null : toObjectId(authorIdRaw, 'authorId');

  const files = await listFilesRecursive(supabase);
  const report = {
    bucket,
    totalFound: files.length,
    inserted: 0,
    existing: 0,
    skipped: 0,
    failed: 0,
    dryRun,
    files: [],
  };

  for (const filePath of files) {
    const normalizedPath = normalizeStoragePath(filePath);
    const info = {
      path: normalizedPath,
      title: fileNameToTitle(normalizedPath.split('/').at(-1) ?? 'lectura'),
      difficulty: getDifficultyFromPath(normalizedPath),
      status: 'pending',
      reason: null,
    };

    try {
      const existing = await readings.findOne({
        deletedAt: { $exists: false },
        'media.path': normalizedPath,
      });

      if (existing) {
        info.status = 'existing';
        info.reason = 'path already exists in MongoDB';
        report.existing += 1;
        report.files.push(info);
        continue;
      }

      if (dryRun) {
        info.status = 'planned';
        info.reason = 'dry-run only';
        report.skipped += 1;
        report.files.push(info);
        continue;
      }

      const document = buildReadingDocument(normalizedPath, institutionId, authorId);
      await readings.insertOne(document);
      info.status = 'inserted';
      report.inserted += 1;
      report.files.push(info);
    } catch (error) {
      info.status = 'failed';
      info.reason = error?.message ?? 'unknown error';
      report.failed += 1;
      report.files.push(info);
      console.error(`[import-readings] Error importando ${normalizedPath}: ${error?.message ?? error}`);
    }
  }

  console.log(JSON.stringify(report, null, 2));

  await client.close();
}

main().catch((error) => {
  console.error('[import-readings] Error:', error?.message ?? error);
  process.exitCode = 1;
});
