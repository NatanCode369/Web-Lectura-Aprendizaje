/**
 * Reglas puras del módulo users.
 */

const EDITABLE_FIELDS = new Set(['fullName', 'profile']);
const MAX_PROFILE_BYTES = 8 * 1024;

/**
 * Valida que el payload de PATCH /me solo contenga campos permitidos.
 * Lanza error con `statusCode: 400` y `code: FORBIDDEN_FIELDS`.
 */
export function pickEditableFields(payload = {}) {
  const forbidden = Object.keys(payload).filter((k) => !EDITABLE_FIELDS.has(k));
  if (forbidden.length > 0) {
    const err = new Error(
      `No puedes modificar los siguientes campos: ${forbidden.join(', ')}`
    );
    err.statusCode = 400;
    err.code = 'FORBIDDEN_FIELDS';
    throw err;
  }
  return payload;
}

/**
 * Construye el documento inicial de un usuario nuevo.
 * Aplica las invariantes del ADR 0003.
 */
export function buildNewUserDoc({
  authUserId,
  email,
  fullName = null,
  institutionId,
  role,
}) {
  if (!authUserId) throw new Error('authUserId es obligatorio');
  if (!email) throw new Error('email es obligatorio');
  if (!institutionId) throw new Error('institutionId es obligatorio');
  if (!role) throw new Error('role es obligatorio');

  const now = new Date();
  return {
    authUserId,
    email: String(email).trim().toLowerCase(),
    fullName: fullName ? String(fullName).slice(0, 120) : null,
    role,
    institutionId,
    status: 'active',
    profile: { avatarUrl: null, preferences: {} },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/**
 * Valida el tamaño del subdocumento profile.
 */
export function validateProfileSize(profile) {
  if (!profile) return true;
  const size = Buffer.byteLength(JSON.stringify(profile), 'utf8');
  if (size > MAX_PROFILE_BYTES) {
    const err = new Error(
      `El perfil excede el tamaño máximo de ${MAX_PROFILE_BYTES} bytes.`
    );
    err.statusCode = 400;
    err.code = 'PROFILE_TOO_LARGE';
    throw err;
  }
  return true;
}

/**
 * Filtro estándar para "usuario vigente".
 */
export function activeUserFilter() {
  return { status: 'active', deletedAt: null };
}