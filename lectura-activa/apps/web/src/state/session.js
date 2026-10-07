/**
 * session.js
 * Estado de la sesión del usuario.
 *
 * Guarda el usuario en sessionStorage (se borra al cerrar la pestaña).
 * NO guarda tokens: la sesión real vive en una cookie HttpOnly.
 */

const STORAGE_KEY = 'lectura-activa:user';

let currentUser = null;

// Cargar al inicio (sincrónico)
try {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) currentUser = JSON.parse(stored);
} catch (err) {
  console.warn('[session] No se pudo cargar la sesión:', err);
}

export function setCurrentUser(user) {
  currentUser = user;
  try {
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[session] No se pudo guardar la sesión:', err);
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return currentUser !== null;
}

export function hasRole(role) {
  return currentUser?.role === role;
}

export function isStudent() {
  return hasRole('student');
}

export function isTeacher() {
  return hasRole('teacher');
}

export function isAdmin() {
  return hasRole('admin');
}

export function clearSession() {
  currentUser = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // ignore
  }
}

export function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = '/src/pages/auth/login.html';
  }
}

export function redirectToDashboard() {
  if (!currentUser) return;
  const paths = {
    student: '/src/pages/student/catalog/catalog.html',
    teacher: '/src/pages/teacher/dashboard-teacher.html',
    admin: '/src/pages/teacher/dashboard-teacher.html',
  };
  window.location.href = paths[currentUser.role] || '/src/pages/auth/login.html';
}