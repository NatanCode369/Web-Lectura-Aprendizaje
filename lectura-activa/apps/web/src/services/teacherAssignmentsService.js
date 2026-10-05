/* Service de asignaciones del docente — Dueño: José
 *
 * (assignmentsService.js es de Omar y cubre al estudiante.)
 *
 * POST /assignments exige readingId y groupId (ObjectId) y las DOS fechas
 * en ISO 8601, con dueAt estrictamente posterior a availableFrom.
 */

import { api } from "./apiClient.js";

const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/** Convierte "2026-10-20" o un Date a ISO; devuelve null si no es válida. */
function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const teacherAssignmentService = {
  /**
   * Asigna una lectura publicada a un grupo.
   * Si faltan fechas: disponible desde ahora y entrega en 7 días.
   */
  async create({ readingId, groupId, availableFrom, dueAt }) {
    const desde = toIso(availableFrom) || new Date().toISOString();
    let hasta = toIso(dueAt);
    /* El backend exige dueAt estrictamente posterior a availableFrom */
    if (!hasta || new Date(hasta) <= new Date(desde)) {
      hasta = new Date(new Date(desde).getTime() + UNA_SEMANA_MS).toISOString();
    }
    return api.post("/assignments", {
      readingId,
      groupId,
      availableFrom: desde,
      dueAt: hasta,
    });
  },

  /**
   * Asignaciones del docente → { items, total, page, limit }.
   * page/limit solo si se piden (mismo motivo que en groupsService).
   */
  async list({ groupId, status, page, limit } = {}) {
    const params = new URLSearchParams();
    if (groupId) params.set("groupId", groupId);
    if (status) params.set("status", status);
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    const query = params.toString();
    return api.get(query ? `/assignments?${query}` : "/assignments");
  },
};
