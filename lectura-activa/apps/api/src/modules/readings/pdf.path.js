/**
 * Utilidades para generación de rutas PDF siguiendo la convención exacta:
 * - Bucket: "readings" (privado)
 * - Ruta: <carpeta>/<id>-<slug>.pdf
 * - Carpetas: short-readings (easy), medium-length-readings (medium), advanced-readings (hard)
 * - ID: correlativo global (mayor existente + 1)
 * - Slug: minúsculas, sin acentos/ñ/espacios/símbolos, máx 80 chars
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../shared/db.js';

const PDF_BUCKET = 'readings';
const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Mapea dificultad a carpeta
 */
export function getFolderByDifficulty(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'short-readings';
    case 'medium':
      return 'medium-length-readings';
    case 'hard':
      return 'advanced-readings';
    default:
      throw new Error(`Dificultad inválida para carpeta: ${difficulty}`);
  }
}

/**
 * Genera slug válido: minúsculas, sin acentos/ñ/espacios/símbolos, máx 80 chars
 */
export function generateSlug(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/ñ/g, 'n')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // solo letras, números, guiones
    .replace(/^-+|-+$/g, '') // sin guiones al inicio/final
    .slice(0, 80); // máx 80 chars
}

/**
 * Genera ruta completa: <carpeta>/<id>-<slug>.pdf
 */
export function buildPdfPath(folder, id, slug) {
  return `${folder}/${id}-${slug}.pdf`;
}

/**
 * Calcula el siguiente ID correlativo global:
 * - Busca el máximo ID en MongoDB (campo implícito en path o campo numérico)
 * - Busca el máximo ID en Supabase Storage (parseando nombres de archivo)
 * - Retorna max + 1
 */
export async function calculateNextId(difficulty, supabaseAdminClient = null) {
  const folder = getFolderByDifficulty(difficulty);
  const db = getDb();
  
  // 1. Buscar en MongoDB: máximo ID numérico en media.path de esa carpeta
  const mongoMax = await db.collection('readings').aggregate([
    { $unwind: '$media' },
    { $match: { 'media.type': 'pdf', 'media.path': { $regex: `^${folder}/` } } },
    { $project: { idNum: { $toInt: { $arrayElemAt: [{ $split: ['$media.path', '/'] }, 1] } } } },
    { $group: { _id: null, maxId: { $max: '$idNum' } } }
  ]).toArray();
  
  const mongoMaxId = mongoMax[0]?.maxId ?? 0;
  
  // 2. Buscar en Supabase Storage (si se proporciona cliente admin)
  let storageMaxId = 0;
  if (supabaseAdminClient) {
    try {
      const { data: files, error } = await supabaseAdminClient.storage
        .from('readings')
        .list(folder, { limit: 1000 });
      
      if (!error && files) {
        for (const file of files) {
          // Extraer ID del nombre: <id>-<slug>.pdf
          const match = file.name.match(/^(\d+)-/);
          if (match) {
            const id = parseInt(match[1], 10);
            if (id > storageMaxId) storageMaxId = id;
          }
        }
      }
    } catch (err) {
      // Si falla la consulta a Storage, continuar solo con MongoDB
      console.warn('[calculateNextId] Error consultando Supabase Storage:', err.message);
    }
  }
  
  return Math.max(mongoMaxId ?? 0, storageMaxId ?? 0) + 1;
}

/**
 * Valida archivo PDF
 */
export function validatePdfFile({ mimetype, filename, size }) {
  if (mimetype !== 'application/pdf') {
    const err = new Error(`Tipo de archivo no permitido. Solo PDF (recibido: ${mimetype})`);
    err.code = 'INVALID_MIME';
    err.statusCode = 400;
    throw err;
  }
  if (!filename || filename.trim().length === 0) {
    const err = new Error('El archivo no tiene nombre');
    err.code = 'MISSING_FILENAME';
    err.statusCode = 400;
    throw err;
  }
  if (typeof size === 'number' && size > PDF_MAX_BYTES) {
    const err = new Error('El PDF supera el límite de 20 MB');
    err.code = 'FILE_TOO_LARGE';
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Verifica magic bytes PDF
 */
export function assertPdfMagicBytes(buffer) {
  const PDF_MAGIC_BYTES = '%PDF-';
  if (!buffer || buffer.length < PDF_MAGIC_BYTES.length) {
    const err = new Error('El archivo es demasiado pequeño para ser un PDF');
    err.code = 'FILE_TOO_SMALL';
    err.statusCode = 400;
    throw err;
  }
  const magic = buffer.subarray(0, PDF_MAGIC_BYTES.length).toString('ascii');
  if (magic !== PDF_MAGIC_BYTES) {
    const err = new Error('El archivo no es un PDF válido');
    err.code = 'INVALID_PDF';
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Sanitiza nombre de archivo para slug
 */
export function sanitizeFilename(filename) {
  const cleaned = filename
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : 'documento';
}

/**
 * Genera nombre único para evitar colisiones
 * Usa UUID v4 como sufijo
 */
export function buildUniquePath(folder, id, slug) {
  const uuid = randomUUID().slice(0, 8);
  return `${folder}/${id}-${slug}-${uuid}.pdf`;
}

export { PDF_BUCKET, PDF_MAX_BYTES };