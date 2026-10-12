/* Service de analítica del docente — Dueño: José */

import { api } from "./apiClient.js";

const BASE = "/analytics";

function rango(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const analyticsService = {
  /**
   * Métricas de un grupo → { groupId, from, to, summary, rows }.
   */
  async byGroup(groupId, { from, to } = {}) {
    return api.get(`${BASE}/groups/${groupId}${rango(from, to)}`);
  },

  /** Métricas de una lectura → { readingId, from, to, summary, rows }. */
  async byReading(readingId, { from, to } = {}) {
    return api.get(`${BASE}/readings/${readingId}${rango(from, to)}`);
  },

  /** Resumen agregado de todos los estudiantes del docente. */
  async summaryByTeacher() {
    return api.get(`${BASE}/summary`);
  },
};