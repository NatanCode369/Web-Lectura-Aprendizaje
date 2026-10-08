import { groupsRepository } from './groups.repository.js';
import {
  assertGroupName,
  assertStudentsFit,
  assertCanArchive
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
      teacherId: user._id,
      studentIds: payload.studentIds,
      status: 'active'
    });

    logger.info({ groupId: group._id, teacherId: user._id }, 'group created');
    return group;
  },

  async list(user, query) {
    return groupsRepository.listByTeacher(user._id, query);
  },

  async getById(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);
    if (!group) throw new NotFoundError('Grupo');
    return group;
  },

  async update(user, id, patch) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);
    if (!group) throw new NotFoundError('Grupo');
    return groupsRepository.update(id, patch);
  },

  async archive(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);
    if (!group) throw new NotFoundError('Grupo');
    assertCanArchive(group);
    return groupsRepository.update(id, { status: 'archived' });
  },

  async remove(user, id) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);
    if (!group) throw new NotFoundError('Grupo');
    await groupsRepository.softDelete(id);
    return { ok: true };
  },

  async addStudents(user, id, studentIds) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);
    if (!group) throw new NotFoundError('Grupo');

    const merged = assertStudentsFit(group.studentIds ?? [], studentIds);
    if (merged.length === (group.studentIds ?? []).length) {
      throw new ValidationError('Ningún estudiante nuevo para agregar');
    }
    return groupsRepository.addStudents(id, studentIds);
  },

  async removeStudent(user, id, studentId) {
    const group = await groupsRepository.findByIdForTeacher(id, user._id);
    if (!group) throw new NotFoundError('Grupo');
    return groupsRepository.removeStudent(id, studentId)
  }
};