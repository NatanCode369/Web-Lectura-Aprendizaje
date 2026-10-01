import { ValidationError, ConflictError } from '../../shared/errors/index.js';

const MAX_EMBEDDED_STUDENTS = 500;

export function assertGroupName(name) {
  if (!name || name.trim().length < 2) {
    throw new ValidationError('El nombre del grupo es demasiado corto');
  }
}

export function assertCanArchive(group) {
  if (group.status === 'archived') {
    throw new ConflictError('El grupo ya está archivado');
  }
}

export function assertStudentsFit(currentIds, newIds) {
  const merged = new Set([
    ...currentIds.map(String),
    ...newIds.map(String)
  ]);
  if (merged.size > MAX_EMBEDDED_STUDENTS) {
    throw new ConflictError(
      `El grupo supera el límite de ${MAX_EMBEDDED_STUDENTS} estudiantes embebidos. ` +
        `Migrar membresías a la colección groupMembers.`
    );
  }
  return [...merged];
}

export function assertGroupBelongsToTeacher(group, teacherId) {
  if (group.teacherId.toString() !== teacherId) {
    throw new ConflictError('El grupo no pertenece al docente');
  }
}