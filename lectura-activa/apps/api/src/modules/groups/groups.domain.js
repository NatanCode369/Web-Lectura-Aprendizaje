import { AppError } from '../../shared/errors/AppError.js';

const MAX_EMBEDDED_STUDENTS = 500;
const MAX_STUDENTS_PER_REQUEST = 100;

export function assertGroupName(name) {
  if (!name || name.trim().length < 2) {
    throw AppError.badRequest('VALIDATION_ERROR', 'El nombre del grupo es demasiado corto');
  }
}

export function assertCanArchive(group) {
  if (group.status === 'archived') {
    throw AppError.conflict('CONFLICT', 'El grupo ya está archivado');
  }
}

export function assertStudentsFit(currentIds, newIds) {
  const merged = new Set([
    ...currentIds.map(String),
    ...newIds.map(String)
  ]);
  if (merged.size > MAX_EMBEDDED_STUDENTS) {
    throw AppError.conflict(
      'CONFLICT',
      `El grupo supera el límite de ${MAX_EMBEDDED_STUDENTS} estudiantes embebidos. ` +
        `Migrar membresías a la colección groupMembers.`
    );
  }
  return [...merged];
}

export function assertGroupBelongsToTeacher(group, teacherId) {
  if (group.teacherId.toString() !== teacherId) {
    throw AppError.conflict('CONFLICT', 'El grupo no pertenece al docente');
  }
}

/**
 * Valida el lote de estudiantes enviado al endpoint de añadir miembros.
 * Evita payloads vacíos, gigantes o con IDs inválidos.
 */
export function assertValidStudentIds(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Se requiere al menos un estudiante');
  }
  if (studentIds.length > MAX_STUDENTS_PER_REQUEST) {
    throw AppError.badRequest(
      'VALIDATION_ERROR',
      `No se pueden añadir más de ${MAX_STUDENTS_PER_REQUEST} estudiantes a la vez`
    );
  }
}