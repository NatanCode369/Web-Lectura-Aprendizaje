/**
 * Reglas puras de dominio para auth.
 * Sin I/O, sin Mongo, sin Supabase, sin Fastify.
 * Todo aquí es testeable sin mocks.
 */

/**
 * Extrae el dominio de un email.
 * @param {string} email
 * @returns {string|null} dominio en minúsculas, o null si no es válido
 */
export function extractDomain(email) {
  if (typeof email !== 'string') return null;
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase().trim();
}

/**
 * Normaliza un email a minúsculas y sin espacios.
 */
export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * Normaliza una lista de dominios permitidos.
 * Acepta entradas con o sin '@' inicial.
 */
export function normalizeAllowedDomains(domains = []) {
  return domains
    .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

/**
 * ¿El dominio del email está en la lista permitida?
 */
export function isDomainAllowed(email, allowedEmailDomains = []) {
  const domain = extractDomain(email);
  if (!domain) return false;
  return normalizeAllowedDomains(allowedEmailDomains).includes(domain);
}

/**
 * Rol por defecto para un usuario nuevo (ADR 0001, A2).
 * La asignación de otro rol requiere acción de administrador.
 */
export function defaultRoleForNewUser() {
  return 'student';
}

/**
 * Estado inicial de un usuario nuevo.
 */
export function defaultStatus() {
  return 'active';
}