/* Service de tareas del estudiante — Dueño: Omar */

import { api } from "./apiClient.js";

export const assignmentService = {
  /**
   * Lista las tareas del estudiante autenticado.
   */
  async listMine({ status, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", page);
    params.set("limit", limit);
    return api.get(`/student-assignments/me/assignments?${params.toString()}`);
  },

  /**
   * Obtiene el detalle de una tarea del estudiante.
   */
  async getMine(studentAssignmentId) {
    return api.get(
      `/student-assignments/me/assignments/${studentAssignmentId}`,
    );
  },

  /**
   * Inicia una tarea (cambia estado a 'in_progress').
   * Idempotente por requestId.
   */
  async start(assignmentId, requestId) {
    return api.post(`/assignments/${assignmentId}/start`, { requestId });
  },

  /**
   * Envía las respuestas de una actividad.
   * Idempotente por requestId.
   */
  async submitAttempt(
    assignmentId,
    { requestId, activityId, answers, timeSpentSeconds },
  ) {
    return api.post(`/assignments/${assignmentId}/attempts`, {
      requestId,
      activityId,
      answers,
      timeSpentSeconds,
    });
  },
};
