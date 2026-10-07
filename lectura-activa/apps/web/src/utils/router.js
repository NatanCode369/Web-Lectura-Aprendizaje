// lectura-activa/apps/web/src/utils/router.js
export function navigate(path) {
  window.history.pushState({}, '', path);
  // Aquí disparas un evento o ejecutas el router
  window.dispatchEvent(new Event('navigate'));
}