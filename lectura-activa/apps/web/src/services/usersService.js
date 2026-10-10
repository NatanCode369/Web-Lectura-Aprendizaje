/* Service de usuarios — Dueño: Omar (P5) */

import { api } from "./apiClient.js";

export const usersService = {
  /**
   * Lista de estudiantes de la institución del docente.
   *
   * ⚠️ Endpoint pendiente de confirmar con Aaron (P4).
   * Si no existe, temporalmente retorna datos mock para probar la UI.
   */
  async listStudents() {
    try {
      return await api.get("/users?role=student");
    } catch (error) {
      // Si el endpoint no existe (404), devolvemos mock temporal
      if (error.status === 404) {
        console.warn(
          "[usersService] Endpoint /users?role=student no existe. Usando mock temporal.",
        );
        return {
          items: [
            {
              _id: "64a1a1a1a1a1a1a1a1a1a1a1",
              fullName: "Alumno Test 1",
              email: "alumno1@kinal.edu.gt",
            },
            {
              _id: "64a2a2a2a2a2a2a2a2a2a2a2",
              fullName: "Alumno Test 2",
              email: "alumno2@kinal.edu.gt",
            },
            {
              _id: "64a3a3a3a3a3a3a3a3a3a3a3",
              fullName: "Alumno Test 3",
              email: "alumno3@kinal.edu.gt",
            },
          ],
        };
      }
      throw error;
    }
  },
};
