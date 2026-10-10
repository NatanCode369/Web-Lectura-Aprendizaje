/**
 * Rutas del módulo users.
 *
 * - GET   /me                  → devuelve el perfil del usuario autenticado.
 * - PATCH /me                  → actualiza fullName y profile (nada más).
 * - GET   /users?role=student  → lista estudiantes de la institución (solo docente/admin).
 *
 * Todas requieren sesión válida (Bearer JWT o cookie HttpOnly).
 */

import { usersRepo } from "./users.repository.js";
import { usersService } from "./users.service.js";
import { patchMeSchema, listStudentsSchema } from "./users.schemas.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { requireRole } from "../../shared/authorization/policies.js";
import { NotFoundError } from "../../shared/errors/AppError.js";

export async function usersRoutes(fastify, opts) {
  const { db } = opts;
  const repo = usersRepo(db);
  const service = usersService(repo);
  const auth = authenticate(db);

  // ---------- GET /me ----------
  fastify.get("/me", { preHandler: [auth] }, async (req) => {
    const user = await repo.findById(req.user._id);
    if (!user) {
      throw new NotFoundError("Usuario");
    }
    return { user: sanitize(user) };
  });

  // ---------- PATCH /me ----------
  fastify.patch(
    "/me",
    { preHandler: [auth], schema: patchMeSchema },
    async (req) => {
      const updated = await service.updateMe(req.user._id, req.body);
      if (!updated) {
        throw new NotFoundError("Usuario");
      }
      return { user: sanitize(updated) };
    },
  );

  // ---------- GET /users?role=student ----------
  fastify.get(
    "/users",
    {
      preHandler: [auth, requireRole("teacher", "admin")],
      schema: listStudentsSchema,
    },
    async (req) => {
      const { role, limit, skip } = req.query;

      // Solo se permite listar estudiantes
      if (role !== "student") {
        return { items: [] };
      }

      return service.listStudents(req.user.institutionId, { limit, skip });
    },
  );
}

/**
 * Nunca devolvemos authUserId ni deletedAt al cliente.
 */
function sanitize(user) {
  const { authUserId, deletedAt, ...safe } = user;
  return safe;
}
