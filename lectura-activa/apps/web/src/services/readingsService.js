/* Service de lecturas — Dueño: Omar */

import { api } from "./apiClient.js";

export const readingService = {
  /**
   * Lista lecturas publicadas con filtros y paginación.
   */
  async list({ search, difficulty, maxMinutes, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (difficulty) params.set("difficulty", difficulty);
    if (maxMinutes) params.set("maxMinutes", maxMinutes);
    params.set("page", page);
    params.set("limit", limit);
    return api.get(`/readings?${params.toString()}`);
  },

  /**
   * Obtiene una lectura por ID.
   */
  async getById(id) {
    return api.get(`/readings/${id}`);
  },
};
