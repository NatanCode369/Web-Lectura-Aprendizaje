import { ObjectId } from 'mongodb';
import { groupsRepository } from './groups.repository.js';
import { getDb } from '../../shared/db.js';
import {
  assertGroupName,
  assertStudentsFit,
  assertCanArchive,
  assertValidStudentIds
} from './groups.domain.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger.js';

export const groupsService = {
  async create(user, payload) {
    assertGroupName(payload.name);

    const group = await groupsRepository.create({
      institutionId: user.institutionId,
      name: payload.name,
      schoolYear: payload.schoolYear,
      teacherId: user._id,              // ✅ arreglado
      studentIds: payload.studentIds ?? [],
      status: 'active'
    });

    logger.info({ groupId: group._id, teacherId: user._id }, 'group created');
    return group;
  },

  async list(user, query) {
    return groupsRepository.listByTeacher(user._id, query);   // ✅
  },

  async getById(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);   // ✅
    if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');
    return group;
  },

  async update(user, id, patch) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);   // ✅
    if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');
    return groupsRepository.update(id, patch);
  },

  async archive(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);   // ✅
    if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');
    assertCanArchive(group);
    return groupsRepository.update(id, { status: 'archived' });
  },

  async remove(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);   // ✅
    if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');
    await groupsRepository.softDelete(id);
    return { ok: true };
  },

  async addStudents(user, id, studentIds) {
  const group = await groupsRepository.findByIdForTeacher(id, user._id);
  if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');

  assertValidStudentIds(studentIds);

  const merged = assertStudentsFit(group.studentIds ?? [], studentIds);
  if (merged.length === (group.studentIds ?? []).length) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Ningún estudiante nuevo para agregar');
  }

  const validStudents = await getDb()
    .collection('users')
    .find(
      {
        _id: { $in: studentIds.map((sid) => new ObjectId(sid)) },
        role: 'student',
        institutionId: new ObjectId(user.institutionId),
        status: 'active',
        deletedAt: null                     // ← CAMBIO: acepta null y ausente
      },
      { projection: { _id: 1 } }
    )
    .toArray();

  const validIds = new Set(validStudents.map((u) => u._id.toString()));
  const rejected = studentIds.filter((sid) => !validIds.has(sid));

  if (validIds.size === 0) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Ningún estudiante es válido para añadir');
  }

  const updated = await groupsRepository.addStudents(id, [...validIds]);

  logger.info(
    { groupId: id, added: validIds.size, rejected: rejected.length },
    'group students added'
  );

  return {
    group: updated,
    added: [...validIds],
    rejected
  };
},

  async removeStudent(user, id, studentId) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);   // ✅
    if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');
    return groupsRepository.removeStudent(id, studentId);
  },

  /**
 * Lista los estudiantes del grupo. Solo docente dueño o admin.
 * Devuelve { items: [{ _id, fullName, email, progress, lastActivityAt }] }
 * según el contrato pedido por el frontend.
 *
 * progress y lastActivityAt son placeholder por ahora.
 * En Fase 2 se enriquecerán con datos de studentAssignments.
 */
async listStudents(user, groupId) {
  const group = await groupsRepository.findByIdForTeacher(groupId, user._id);
  if (!group) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');

  const result = await groupsRepository.findMembers(groupId, user.institutionId);
  if (!result) throw AppError.notFound('NOT_FOUND', 'Grupo no encontrado');

  return {
    items: result.members.map((m) => ({
      _id: m._id,
      fullName: m.fullName,
      email: m.email,
      progress: 0,           // placeholder Fase 2
      lastActivityAt: null   // placeholder Fase 2
    }))
  };
},

  async listMine(user) {
    const groups = await groupsRepository.findByStudent(user._id);   // ✅

    return {
      groups: groups.map((g) => ({
        _id: g._id,
        name: g.name,
        schoolYear: g.schoolYear
      })),
      total: groups.length
    };
  }
};