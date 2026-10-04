/**
 * validators.js
 * Funciones puras para validar datos de formularios.
 */

/**
 * Valida que un correo sea institucional (@kinal.edu.gt).
 */
export function isInstitutionalEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@kinal\.edu\.gt$/i;
  return regex.test(email.trim().toLowerCase());
}

/**
 * Valida formato general de correo.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim().toLowerCase());
}

/**
 * Valida contraseña: mínimo 8 caracteres.
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'La contraseña es obligatoria.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  return { valid: true, message: '' };
}

/**
 * Valida nombre completo: mínimo 3 caracteres, solo letras y espacios.
 */
export function validateFullName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'El nombre es obligatorio.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { valid: false, message: 'El nombre debe tener al menos 3 caracteres.' };
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trimmed)) {
    return { valid: false, message: 'El nombre solo puede contener letras y espacios.' };
  }
  return { valid: true, message: '' };
}

/**
 * Valida que dos contraseñas coincidan.
 */
export function validatePasswordMatch(password, confirm) {
  if (password !== confirm) {
    return { valid: false, message: 'Las contraseñas no coinciden.' };
  }
  return { valid: true, message: '' };
}