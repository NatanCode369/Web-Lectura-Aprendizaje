/* Service de analítica del docente — Dueño: José
 *
 * Contrato (CONTEXTO_TECNICO §7). El docente solo ve sus propios grupos.
 * Igual que en grupos: si el backend publica la ruta duplicada, se ajusta
 * únicamente la constante BASE.
 */

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
   * Métricas diarias de un grupo → { groupId, from, to, rows }.
   * Cada fila: { date, assignmentId, completedCount, assignedCount,
   * averageScore, averageTimeSeconds }. from/to (ISO) son opcionales.
   */
  async byGroup(groupId, { from, to } = {}) {
    return api.get(`${BASE}/groups/${groupId}${rango(from, to)}`);
  },

  /** Métricas diarias de una lectura → { readingId, from, to, rows }. */
  async byReading(readingId, { from, to } = {}) {
    return api.get(`${BASE}/readings/${readingId}${rango(from, to)}`);
  },
};
