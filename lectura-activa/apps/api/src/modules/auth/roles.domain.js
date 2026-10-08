/**
 * Lógica pura de asignación de roles.
 *
 * El rol se resuelve por whitelist en dos colecciones (`admins`, `teachers`).
 * Todo lo demás es `student` por defecto.
 */

export function normalizeEmailForRole(email) {
  return String(email ?? '').toLowerCase().trim();
}

/**
 * Resuelve el rol del usuario según la whitelist.
 *
 * @param {string} email
 * @param {{ admins: string[], teachers: string[] }} whitelist
 * @returns {'admin'|'teacher'|'student'}
 */
export function resolveRoleFromWhitelist(email, { admins = [], teachers = [] }) {
  const normalized = normalizeEmailForRole(email);
  if (!normalized) return 'student';

  const adminSet = new Set(admins.map(normalizeEmailForRole));
  const teacherSet = new Set(teachers.map(normalizeEmailForRole));

  if (adminSet.has(normalized)) return 'admin';
  if (teacherSet.has(normalized)) return 'teacher';
  return 'student';
}

/**
 * Determina si hay que actualizar el rol de un usuario existente.
 */
export function shouldUpdateRole(currentRole, newRole) {
  return currentRole !== newRole;
}