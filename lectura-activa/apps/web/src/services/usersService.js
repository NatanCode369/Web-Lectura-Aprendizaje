/* Service de usuarios — Dueño: Omar (P5) */

import { api } from "./apiClient.js";

export const usersService = {
  /**
   * Lista de estudiantes de la institución del docente.
   * GET /api/v1/users?role=student
   *
   * Requiere sesión activa (cookie HttpOnly).
   * Solo docente/admin puede llamarlo.
   */
  async listStudents() {
    return api.get("/users?role=student");
  },
};
