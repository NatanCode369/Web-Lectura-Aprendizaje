import { AppError } from '../../shared/errors/AppError.js';

const MAX_EMBEDDED_STUDENTS = 500;

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