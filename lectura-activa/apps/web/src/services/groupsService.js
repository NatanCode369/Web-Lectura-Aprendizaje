/* Service de grupos del docente — Dueño: José
 *
 * Contrato del backend (apps/api/src/modules/groups). Todos exigen sesión.
 * Los studentIds son ObjectId de MongoDB (NO correos ni ids de Supabase).
 */

import { api } from "./apiClient.js";

/* Ruta base según CONTEXTO_TECNICO (/groups). Hoy el backend la publica
 * duplicada (/groups/groups) por un error de prefijo; cuando se corrija
 * no hay que tocar nada más, y si hiciera falta se cambia SOLO aquí. */
const BASE = "/groups";

export const groupsService = {
  /**
   * Grupos del docente autenticado → { items, total, page, limit }.
   * page/limit solo se envían si se piden: hoy el backend valida el query
   * con z.number() (sin convertir texto) y rechazaría "page=1". Sin ellos
   * usa sus valores por defecto (página 1, 20 por página).
   */
  async list({ status, page, limit } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    const query = params.toString();
    return api.get(query ? `${BASE}?${query}` : BASE);
  },

  async getById(id) {
    return api.get(`${BASE}/${id}`);
  },

  /** @param {{ name: string, schoolYear: string, studentIds?: string[] }} data */
  async create({ name, schoolYear, studentIds = [] }) {
    return api.post(BASE, { name, schoolYear, studentIds });
  },

  async update(id, patch) {
    return api.patch(`${BASE}/${id}`, patch);
  },

  async remove(id) {
    return api.delete(`${BASE}/${id}`);
  },

  async addStudents(id, studentIds) {
    return api.post(`${BASE}/${id}/students`, { studentIds });
  },

  async removeStudent(id, studentId) {
    return api.delete(`${BASE}/${id}/students/${studentId}`);
  },

  /**
   * Lista de estudiantes de un grupo.
   * GET /api/v1/groups/:id/students → { items: [{ _id, fullName, email, progress, lastActivityAt }] }
   *
   * ⚠️ `progress` y `lastActivityAt` son placeholders (0 y null) hasta Fase 2.
   */
  async getStudents(groupId) {
    return api.get(`${BASE}/${groupId}/students`);
  },
};
