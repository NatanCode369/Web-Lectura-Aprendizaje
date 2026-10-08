// lectura-activa/apps/web/src/main.js
import './styles/base.css';
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Vercel Speed Insights
injectSpeedInsights();

/**
 * Router simple para la SPA
 * Detecta la ruta actual y carga la página correspondiente
 */
async function router() {
  const app = document.querySelector('#app');
  
  if (!app) {
    console.warn('[router] No se encontró #app en el DOM. Abortando.');
    return;
  }

  // Obtener la ruta actual (sin la raíz de la aplicación)
  const path = window.location.pathname;
  
  try {
    let html = '';
    
    // Rutas disponibles
    if (path === '/' || path === '') {
      // Ruta raíz → login
      const response = await fetch('/src/pages/auth/login.html');
      html = await response.text();
    } else if (path === '/register') {
      const response = await fetch('/src/pages/auth/register.html');
      html = await response.text();
    } else if (path === '/forgot-password') {
      const response = await fetch('/src/pages/auth/forgot-password.html');
      html = await response.text();
    } else if (path === '/dashboard') {
      const response = await fetch('/src/pages/dashboard/dashboard.html');
      html = await response.text();
    } else {
      // Ruta no encontrada → redirigir a login
      window.location.href = '/';
      return;
    }
    
    // Inyectar el HTML en el #app
    app.innerHTML = html;
    
    // ⭐ Aquí es donde cargas el JS de la página (login.js, register.js, etc.)
    // El HTML ya incluye <script type="module" src="./login.js"></script>
    // así que se ejecutará automáticamente después de insertarlo
    
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
import './styles/base.css';
import './styles/auth.css';
import './pages/auth/login.js';
import './utils/analytics.js';
