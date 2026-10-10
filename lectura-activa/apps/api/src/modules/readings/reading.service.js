import { randomUUID } from 'node:crypto';
import {
  AppError,
  ErrorCodes,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { getDb } from '../../shared/db.js';
import {
  assertCanEdit,
  assertCanPublish,
  buildNewReading,
  buildReadingUpdate,
  validateReadingInput,
} from './reading.domain.js';
import {
  getFolderByDifficulty,
  generateSlug,
  buildPdfPath,
  calculateNextId,
  validatePdfFile,
  assertPdfMagicBytes,
  PDF_BUCKET,
  PDF_MAX_BYTES,
} from './pdf.path.js';

const PDF_URL_TTL_SECONDS = 60 * 60;    // 1 hora
const PDF_MAGIC_BYTES = '%PDF-';

function sameInstitution(reading, user) {
  return user.role === 'admin' || reading.institutionId.equals(user.institutionId);
}

function canManage(reading, user) {
  return user.role === 'admin' || (user.role === 'teacher' && reading.authorId.equals(user._id));
}

// validatePdfFile is imported from pdf.path.js
// assertPdfMagicBytes is imported from pdf.path.js

function findPdfMedia(reading) {
  const media = Array.isArray(reading.media) ? reading.media : [];
  const pdfs = media.filter((m) => m.type === 'pdf' && m.path);
  return pdfs.length > 0 ? pdfs[pdfs.length - 1] : null;
}

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

async function toPublicReading(reading) {
  const pdfMedia = findPdfMedia(reading);
  const pdfUrl = pdfMedia ? await generateSignedPdfUrl(pdfMedia.path) : null;

  const { media, ...rest } = reading;

  return {
    ...rest,
    media: { pdfUrl },
  };
}

export function buildReadingService({ readingRepository, auditRepository }) {
  return {
    async create(input, user) {
      if (!['teacher', 'admin'].includes(user.role)) {
        throw new ForbiddenError();
      }
      const document = buildNewReading(input, user);
      const created = await readingRepository.create(document);
      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.created',
        resourceId: created._id.toString(),
      });
      return created;
    },

    async update(id, input, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw new NotFoundError('Lectura');
      if (!sameInstitution(reading, user)) throw new ForbiddenError();
      assertCanEdit(reading, user);

      const update = buildReadingUpdate(input, reading.version);
      const updated = await readingRepository.updateById(
        id,
        { version: reading.version },
        update
      );
      if (!updated) {
        throw new ConflictError(
          ErrorCodes.CONFLICT,
          'La lectura cambió mientras se procesaba la actualización; vuelve a cargarla e inténtalo de nuevo'
        );
      }

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.updated',
        resourceId: id,
        metadata: { version: updated.version },
      });
      return updated;
    },

    async publish(id, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw new NotFoundError('Lectura');
      if (!sameInstitution(reading, user)) throw new ForbiddenError();
      if (!canManage(reading, user)) throw new ForbiddenError();
      assertCanPublish(reading);

      const updated = await readingRepository.updateById(
        id,
        { version: reading.version, status: 'draft' },
        {
          status: 'published',
          version: reading.version + 1,
          updatedAt: new Date(),
        }
      );
      if (!updated) {
        throw new ConflictError(
          ErrorCodes.CONFLICT,
          'La lectura cambió mientras se procesaba la publicación; vuelve a cargarla e inténtalo de nuevo'
        );
      }

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.published',
        resourceId: id,
        metadata: { version: updated.version },
      });
      return updated;
    },

    async getById(id, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw new NotFoundError('Lectura');
      if (!reading.institutionId.equals(user.institutionId)) {
        throw new ForbiddenError();
      }

      const isManager = canManage(reading, user);
      if (reading.status !== 'published' && !isManager) {
        throw new NotFoundError('Lectura');
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
        limit: query.limit,
      });
    },

    async uploadPdf(id, file, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw new NotFoundError('Lectura');
      if (!sameInstitution(reading, user)) throw new ForbiddenError();
      if (!canManage(reading, user)) throw new ForbiddenError();

      validatePdfFile({
        mimetype: file.mimetype,
        filename: file.filename,
        size: file.size,
      });
      assertPdfMagicBytes(file.buffer);

      // Calcular siguiente ID correlativo global (consulta MongoDB + Supabase Storage)
      const nextId = await calculateNextId(reading.difficulty, supabaseAdmin);
      
      // Generar slug a partir del título
      const slug = generateSlug(reading.title);
      
      // Determinar carpeta según dificultad
      const folder = getFolderByDifficulty(reading.difficulty);
      
      // Construir ruta: <carpeta>/<id>-<slug>.pdf
      const path = buildPdfPath(folder, nextId, slug);

      const { error: uploadError } = await supabaseAdmin.storage
        .from(PDF_BUCKET)
        .upload(path, file.buffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        logger.error(
          { err: uploadError, readingId: id, path },
          '[pdf] upload failed'
        );
        throw new AppError(
          500,
          ErrorCodes.UPLOAD_FAILED,
          'No se pudo subir el PDF'
        );
      }

      const mediaItem = { type: 'pdf', path, alt: file.filename };
      const updated = await readingRepository.addMedia(id, mediaItem);

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.pdf.uploaded',
        resourceId: id,
        metadata: { path },
      });

      return toPublicReading(updated);
    },

    async deletePdf(id, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw new NotFoundError('Lectura');
      if (!sameInstitution(reading, user)) throw new ForbiddenError();
      if (!canManage(reading, user)) throw new ForbiddenError();

      const pdfMedia = findPdfMedia(reading);
      if (!pdfMedia) {
        throw new NotFoundError('PDF no encontrado en la lectura');
      }

      const path = pdfMedia.path;

      // Eliminar de Supabase Storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from(PDF_BUCKET)
        .remove([path]);

      if (deleteError) {
        logger.error(
          { err: deleteError, readingId: id, path },
          '[pdf] delete failed'
        );
        throw new AppError(
          500,
          ErrorCodes.UPLOAD_FAILED,
          'No se pudo eliminar el PDF'
        );
      }

      // Eliminar de MongoDB (quitar del array media)
      const updated = await readingRepository.updateById(
        id,
        { deletedAt: { $exists: false } },
        { $pull: { media: { type: 'pdf' } }, $set: { updatedAt: new Date() } }
      );

      await auditRepository.record({
        actorId: user._id.toString(),
        action: 'reading.pdf.deleted',
        resourceId: id,
        metadata: { path },
      });

      return toPublicReading(updated);
    },
  };
}