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
  const response = await api.post('/auth/login', { email, password });
  const user = response?.user ?? response?.data ?? response;
  setCurrentUser(user);
  return user;
}

/**
 * Registro de nuevo usuario.
 * @param {{ email: string, password: string, fullName: string }} data
 * @returns {Promise<object>} respuesta del backend
 */
export async function register({ email, password, fullName }) {
  const response = await api.post('/auth/register', {
    email,
    password,
    fullName,
  });
  const user = response?.user ?? response?.data ?? response;
  if (user) setCurrentUser(user);
  return response;
}

/**
 * Cerrar sesión. El backend borra la cookie.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    console.warn('[authService] Error al cerrar sesión:', e);
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
 * Obtener el usuario actual desde el backend.
 * Usa las cookies HttpOnly automáticamente.
 */
export async function fetchMe() {
  const response = await api.get('/me');
  const user = response?.user ?? response?.data ?? response;
  setCurrentUser(user);
  return user;
}