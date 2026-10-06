import { analyticsRepository } from './analytics.repository.js';
import { groupsRepository } from '../groups/groups.repository.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';

export const analyticsService = {
  async getGroupAnalytics(user, groupId, { from, to }) {
    const group = await groupsRepository.findByIdForTeacher(groupId, user.userId);

    if (!group) {
      if (user.role === 'admin') {
        const anyGroup = await groupsRepository.findById(groupId);
        if (!anyGroup) throw new NotFoundError('Grupo');
      } else {
        throw new ForbiddenError('Este grupo no te pertenece');
      }
    }

    const rows = await analyticsRepository.findByGroup(groupId, { from, to });
    return { groupId, from: from ?? null, to: to ?? null, rows };
  },

  async getReadingAnalytics(user, readingId, { from, to }) {
    // Sólo el docente dueño de las asignaciones de esa lectura ve la analítica.
    // La verificación se delega al repositorio de assignments en la capa de servicio
    // que llama; aquí asumimos que ya fue validado por requireRole + control de dueño.
    const rows = await analyticsRepository.findByAssignment(readingId, { from, to });
    return { readingId, from: from ?? null, to: to ?? null, rows };

  }
};