/**
 * session.js
 * Estado de la sesión del usuario (efímero, se pierde al cerrar la pestaña).
 *
 * Guarda el usuario actual (id, email, rol, nombre) y expone helpers.
 * NO guarda tokens: la sesión real vive en una cookie HttpOnly.
 */

let currentUser = null;

/**
 * Guarda el usuario tras un login exitoso.
 * @param {{ id, email, fullName, role }} user
 */
export function setCurrentUser(user) {
  currentUser = user;
}

/**
 * Devuelve el usuario actual (o null si no hay sesión).
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * ¿Hay sesión activa?
 */
export function isLoggedIn() {
  return currentUser !== null;
}

/**
 * ¿El usuario tiene cierto rol?
 * @param {'student'|'teacher'|'admin'} role
 */
export function hasRole(role) {
  return currentUser?.role === role;
}

/**
 * ¿Es estudiante?
 */
export function isStudent() {
  return hasRole('student');
}

/**
 * ¿Es docente?
 */
export function isTeacher() {
  return hasRole('teacher');
}

/**
 * ¿Es admin?
 */
export function isAdmin() {
  return hasRole('admin');
}

/**
 * Cierra la sesión local (NO borra la cookie, eso lo hace el backend).
 */
export function clearSession() {
  currentUser = null;
}

/**
 * Redirige al login si no hay sesión.
 * Se usa como guardia al inicio de páginas protegidas.
 */
export function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = '/src/pages/auth/login.html';
  }
}

/**
 * Redirige al dashboard según el rol.
 */
export function redirectToDashboard() {
  if (!currentUser) return;
  const paths = {
    student: '/src/pages/student/catalog/catalog.html',
    teacher: '/src/pages/teacher/dashboard-teacher.html',
    admin: '/src/pages/admin/dashboard.html'
  };
  window.location.href = paths[currentUser.role] || '/src/pages/auth/login.html';
}