import { groupsRepository } from './groups.repository.js';
import {
  assertGroupName,
  assertStudentsFit,
  assertCanArchive
} from './groups.domain.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';

export const groupsService = {
  async create(user, payload) {
    assertGroupName(payload.name);

    const group = await groupsRepository.create({
      institutionId: user.institutionId,
      name: payload.name,
      schoolYear: payload.schoolYear,
      teacherId: user.userId,
      studentIds: payload.studentIds,
      status: 'active'
    });

    logger.info({ groupId: group._id, teacherId: user.userId }, 'group created');
    return group;
  },

  async list(user, query) {
    return groupsRepository.listByTeacher(user.userId, query);
  },

  async getById(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user.userId);
    if (!group) throw new NotFoundError('Grupo');
    return group;
  },

  async update(user, id, patch) {
    const group = await groupsRepository.findByIdForTeacher(id, user.userId);
    if (!group) throw new NotFoundError('Grupo');
    return groupsRepository.update(id, patch);
  },

  async archive(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user.userId);
    if (!group) throw new NotFoundError('Grupo');
    assertCanArchive(group);
    return groupsRepository.update(id, { status: 'archived' });
  },

  async remove(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user.userId);
    if (!group) throw new NotFoundError('Grupo');
    await groupsRepository.softDelete(id);
    return { ok: true };
  },

  async addStudents(user, id, studentIds) {
    const group = await groupsRepository.findByIdForTeacher(id, user.userId);
    if (!group) throw new NotFoundError('Grupo');

    const merged = assertStudentsFit(group.studentIds ?? [], studentIds);
    if (merged.length === (group.studentIds ?? []).length) {
      throw new ValidationError('Ningún estudiante nuevo para agregar');
    }
    return groupsRepository.addStudents(id, studentIds);
  },

  async removeStudent(user, id, studentId) {
    const group = await groupsRepository.findByIdForTeacher(id, user.userId);
    if (!group) throw new NotFoundError('Grupo');
    return groupsRepository.removeStudent(id, studentId);
  }
};