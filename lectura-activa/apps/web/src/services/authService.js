/**
 * authService.js
 * Operaciones de autenticación.
 *
 * El backend maneja la sesión mediante cookies HttpOnly.
 * El frontend NO guarda tokens en localStorage.
 */

import { api } from './apiClient.js';
import { setCurrentUser, clearSession } from '../state/session.js';

/**
 * Login con correo y contraseña.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<object>} usuario
 */
export async function login({ email, password }) {
  const user = await api.post('/auth/login', { email, password });
  setCurrentUser(user);
  return user;
}

/**
 * Registro de nuevo usuario.
 * @param {{ email, password, fullName, role }} data
 */
export async function register({ email, password, fullName, role }) {
  const user = await api.post('/auth/register', { email, password, fullName, role });
  setCurrentUser(user);
  return user;
}

/**
 * Cerrar sesión. El backend borra la cookie.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // Ignorar errores de red al cerrar sesión
  }
  clearSession();
  window.location.href = '/src/pages/auth/login.html';
}

/**
 * Recuperar contraseña (envía correo).
 * @param {string} email
 */
export async function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

/**
 * Obtener el usuario actual desde el backend (por si el frontend no lo tiene).
 */
export async function fetchMe() {
  const user = await api.get('/me');
  setCurrentUser(user);
  return user;
}