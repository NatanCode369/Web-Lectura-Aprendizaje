import { randomUUID } from 'node:crypto';
import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';
import {
  assertCanEdit,
  assertCanPublish,
  buildNewReading,
  buildReadingUpdate,
  validateReadingInput
} from './reading.domain.js';

const PDF_BUCKET = 'readings';
const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const PDF_URL_TTL_SECONDS = 60 * 60;    // 1 hora
const PDF_MAGIC_BYTES = '%PDF-';

function sameInstitution(reading, user) {
  return user.role === 'admin' || reading.institutionId.equals(user.institutionId);
}

function canManage(reading, user) {
  return user.role === 'admin' || (user.role === 'teacher' && reading.authorId.equals(user._id));
}

/**
 * Valida el archivo recibido por multipart antes de subirlo.
 */
function validatePdfFile({ mimetype, filename, size }) {
  if (mimetype !== 'application/pdf') {
    throw AppError.badRequest(
      `Tipo de archivo no permitido. Solo PDF (recibido: ${mimetype})`
    );
  }
  if (!filename || filename.trim().length === 0) {
    throw AppError.badRequest('El archivo no tiene nombre');
  }
  if (typeof size === 'number' && size > PDF_MAX_BYTES) {
    throw AppError.badRequest('El PDF supera el límite de 20 MB');
  }
}

/**
 * Verifica los primeros bytes del archivo. El MIME del cliente miente.
 */
function assertPdfMagicBytes(buffer) {
  if (!buffer || buffer.length < PDF_MAGIC_BYTES.length) {
    throw AppError.badRequest('El archivo es demasiado pequeño para ser un PDF');
  }
  const magic = buffer.subarray(0, PDF_MAGIC_BYTES.length).toString('ascii');
  if (magic !== PDF_MAGIC_BYTES) {
    throw AppError.badRequest('El archivo no es un PDF válido');
  }
}

function sanitizeFilename(filename) {
  const cleaned = filename
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : 'documento';
}

function buildPdfPath(readingId, safeName, uuid) {
  return `readings/${readingId}/${uuid}-${safeName}.pdf`;
}

function findPdfMedia(reading) {
  const media = Array.isArray(reading.media) ? reading.media : [];
  const pdfs = media.filter((m) => m.type === 'pdf' && m.path);
  return pdfs.length > 0 ? pdfs[pdfs.length - 1] : null;
}

/**
 * Genera una URL firmada temporal para un path de Supabase Storage.
 */
async function generateSignedPdfUrl(path) {
  if (!path) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, PDF_URL_TTL_SECONDS);

  if (error) {
    logger.error({ err: error, path }, '[pdf] no se pudo firmar la URL');
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Transforma el documento crudo en la forma pública:
 * media pasa de array a objeto { pdfUrl }.
 */
async function toPublicReading(reading) {
  const pdfMedia = findPdfMedia(reading);
  const pdfUrl = pdfMedia ? await generateSignedPdfUrl(pdfMedia.path) : null;

  const { media, ...rest } = reading;

  return {
    ...rest,
    media: { pdfUrl }
  };
}

export function buildReadingService({ readingRepository, auditRepository }) {
  return {
    async create(input, user) {
      if (!['teacher', 'admin'].includes(user.role)) throw AppError.forbidden();
      const document = buildNewReading(input, user);
      const created = await readingRepository.create(document);
      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.created',
        resourceId: created._id.toString()
      });
      return created;
    },

    async update(id, input, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw AppError.notFound('Lectura no encontrada');
      if (!sameInstitution(reading, user)) throw AppError.forbidden();
      assertCanEdit(reading, user);

      const update = buildReadingUpdate(input, reading.version);
      const updated = await readingRepository.updateById(
        id,
        { version: reading.version },
        update
      );
      if (!updated) {
        throw AppError.conflict(
          'La lectura cambió mientras se procesaba la actualización; vuelve a cargarla e inténtalo de nuevo'
        );
      }

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.updated',
        resourceId: id,
        metadata: { version: updated.version }
      });
      return updated;
    },

    async publish(id, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw AppError.notFound('Lectura no encontrada');
      if (!sameInstitution(reading, user)) throw AppError.forbidden();
      if (!canManage(reading, user)) throw AppError.forbidden();
      assertCanPublish(reading);

      const updated = await readingRepository.updateById(
        id,
        { version: reading.version, status: 'draft' },
        {
          status: 'published',
          version: reading.version + 1,
          updatedAt: new Date()
        }
      );
      if (!updated) {
        throw AppError.conflict(
          'La lectura cambió mientras se procesaba la publicación; vuelve a cargarla e inténtalo de nuevo'
        );
      }

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.published',
        resourceId: id,
        metadata: { version: updated.version }
      });
      return updated;
    },

    /**
     * Devuelve la lectura con `media: { pdfUrl }` (URL firmada temporal).
     */
    async getById(id, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw AppError.notFound('Lectura no encontrada');
      if (!reading.institutionId.equals(user.institutionId)) {
        throw AppError.forbidden();
      }

      const isManager = canManage(reading, user);
      if (reading.status !== 'published' && !isManager) {
        throw AppError.notFound('Lectura no encontrada');
      }

      return toPublicReading(reading);
    },

    async list(query, user) {
      return readingRepository.list({
        institutionId: user.institutionId,
        search: query.search,
        difficulty: query.difficulty,
        maxMinutes: query.maxMinutes,
        page: query.page,
        limit: query.limit
      });
    },

    /**
     * Sube un PDF a Supabase Storage y lo adjunta a la lectura.
     * Reemplaza el PDF previo si existía.
     */
    async uploadPdf(id, file, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw AppError.notFound('Lectura no encontrada');
      if (!sameInstitution(reading, user)) throw AppError.forbidden();
      if (!canManage(reading, user)) throw AppError.forbidden();

      validatePdfFile({
        mimetype: file.mimetype,
        filename: file.filename,
        size: file.size
      });
      assertPdfMagicBytes(file.buffer);

      const safeName = sanitizeFilename(file.filename);
      const uuid = randomUUID();
      const path = buildPdfPath(id, safeName, uuid);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(PDF_BUCKET)
        .upload(path, file.buffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        logger.error(
          { err: uploadError, readingId: id, path },
          '[pdf] upload failed'
        );
        throw AppError.internal('UPLOAD_FAILED', 'No se pudo subir el PDF');
      }

      const mediaItem = { type: 'pdf', path, alt: file.filename };
      const updated = await readingRepository.addMedia(id, mediaItem);

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.pdf.uploaded',
        resourceId: id,
        metadata: { path }
      });

      return toPublicReading(updated);
    }
  };
}