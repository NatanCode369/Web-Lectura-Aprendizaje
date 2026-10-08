// lectura-activa/apps/web/src/main.js
import './styles/base.css';
import './styles/auth.css';
import './utils/analytics.js';

/**
 * Router simple para la SPA
 * Detecta la ruta actual y carga la página correspondiente
 */
const ROUTE_MAP = {
  // Auth routes
  '/': 'auth/login.html',
  '/login': 'auth/login.html',
  '/register': 'auth/register.html',
  '/forgot-password': 'auth/forgot-password.html',
  '/reset-password': 'auth/reset-password.html',

  // Student routes
  '/catalog': 'student/catalog/catalog.html',
  '/my-tasks': 'student/my-tasks/my-tasks.html',
  '/my-progress': 'student/my-progress/my-progress.html',
  '/reading-detail': 'student/reading-detail/reading-detail.html',
  '/reading-activity': 'student/reading-activity/reading-activity.html',
  '/feedback': 'student/feedback/feedback.html',
  '/user-profile': 'student/user-profile/user-profile.html',
  '/activities/multiple-choice': 'student/activities/multiple-choice.html',
  '/activities/true-false': 'student/activities/true-false.html',
  '/activities/ordering': 'student/activities/ordering.html',
  '/activities/matching': 'student/activities/matching.html',
  '/activities/short-answer': 'student/activities/short-answer.html',
  '/activities/detective-words': 'student/activities/detective-words.html',

  // Teacher routes
  '/dashboard': 'teacher/dashboard-teacher.html',
  '/groups': 'teacher/groups.html',
  '/reading-new': 'teacher/reading-new.html',
  '/reading-edit': 'teacher/reading-edit.html',
  '/activities-edit': 'teacher/activities-edit.html',
  '/stats': 'teacher/stats.html',
};

async function router() {
  const app = document.querySelector('#app');

  if (!app) {
    console.warn('[router] No se encontró #app en el DOM. Abortando.');
    return;
  }

  const path = window.location.pathname;

  try {
    const page = ROUTE_MAP[path];

    if (!page) {
      // Ruta no encontrada → redirigir a login
      window.location.href = '/login';
      return;
    }

    const response = await fetch(`/src/pages/${page}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${page}: ${response.status}`);
    }
    const html = await response.text();

    // Inyectar el HTML en el #app
    app.innerHTML = html;

  } catch (err) {
    console.error('[router] Error cargando página:', err);
    app.innerHTML = '<h1>Error al cargar la página</h1>';
  }
}

// Ejecutar el router cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', router);
} else {
  router();
}

// Manejar cambios de URL (para navegación sin recargar la página)
window.addEventListener('navigate', router);

// Navegación programática
window.navigateTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('navigate'));
};