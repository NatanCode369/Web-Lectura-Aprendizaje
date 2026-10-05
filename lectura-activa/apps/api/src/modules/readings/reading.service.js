import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import { assertCanEdit, assertCanPublish, buildNewReading, buildReadingUpdate, validateReadingInput } from './reading.domain.js';

function sameInstitution(reading, user) {
  return user.role === 'admin' || reading.institutionId.equals(user.institutionId);
}

function canManage(reading, user) {
  return user.role === 'admin' || (user.role === 'teacher' && reading.authorId.equals(user._id));
}

export function buildReadingService({ readingRepository, auditRepository }) {
  return {
    async create(input, user) {
      if (!['teacher', 'admin'].includes(user.role)) throw AppError.forbidden();
      const document = buildNewReading(input, user);
      const created = await readingRepository.create(document);
      await auditRepository.record({ actorId: user._id.toString(), action: 'reading.created', resourceId: created._id.toString() });
      return created;
    },

    async update(id, input, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw AppError.notFound('Lectura no encontrada');
      if (!sameInstitution(reading, user)) throw AppError.forbidden();
      assertCanEdit(reading, user);

      const update = buildReadingUpdate(input, reading.version);
      const updated = await readingRepository.updateById(id, { version: reading.version }, update);
      if (!updated) throw AppError.conflict('La lectura cambió mientras se procesaba la actualización; vuelve a cargarla e inténtalo de nuevo');

      await auditRepository.record({ actorId: user._id.toString(), action: 'reading.updated', resourceId: id, metadata: { version: updated.version } });
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
        { status: 'published', version: reading.version + 1, updatedAt: new Date() }
      );
      if (!updated) throw AppError.conflict('La lectura cambió mientras se procesaba la publicación; vuelve a cargarla e inténtalo de nuevo');

      await auditRepository.record({ actorId: user._id.toString(), action: 'reading.published', resourceId: id, metadata: { version: updated.version } });
      return updated;
    },

    async getById(id, user) {
      const reading = await readingRepository.findById(id);
      if (!reading) throw AppError.notFound('Lectura no encontrada');
      if (!reading.institutionId.equals(user.institutionId)) throw AppError.forbidden();

      const isManager = canManage(reading, user);
      if (reading.status !== 'published' && !isManager) throw AppError.notFound('Lectura no encontrada');
      return reading;
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
    }
  };
}
