/**
 * authGuard.js
 * Guardas de acceso asíncronas para pantallas protegidas.
 * Dueño: Omar (P5)
 *
 * A diferencia del requireLogin() de session.js (que es síncrono),
 * este verifica contra el backend llamando a /me. Si la cookie
 * expiró o es inválida, redirige al login.
 */

import { fetchMe } from "../services/authService.js";
import { setCurrentUser } from "../state/session.js";

/**
 * Verifica que el usuario esté autenticado.
 * Si no lo está, redirige al login.
 * @returns {Promise<object|null>} usuario o null
 */
export async function requireLogin() {
  try {
    const user = await fetchMe();
    setCurrentUser(user); // refresca la sesión local
    return user;
  } catch (error) {
    console.warn("[authGuard] No autenticado:", error);

    // Limpiar la sesión local antes de redirigir
    try {
      sessionStorage.removeItem("lectura-activa:user");
    } catch (e) {
      // ignore
    }

    window.location.href = "/src/pages/auth/login.html";
    return null;
  }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * @param {string[]} allowedRoles
 * @returns {Promise<object|null>}
 */
export async function requireRole(allowedRoles = []) {
  const user = await requireLogin();
  if (!user) return null;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn("[authGuard] Rol no autorizado:", user.role);
    window.location.href = "/src/pages/auth/login.html";
    return null;
  }

  return user;
}
