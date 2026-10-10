/**
 * authGuard.js
 * Guardas de acceso asíncronas para pantallas protegidas.
 * Dueño: Omar (P5)
 *
 * A diferencia del requireLogin() de session.js (que es síncrono),
 * este verifica contra el backend llamando a /me. Si la cookie
 * expiró o es inválida, redirige al login con un motivo visible.
 *
 * Diferencias clave:
 * - Solo cierra la sesión local cuando el backend dice que NO hay sesión (401).
 *   Si falla la red, el servidor está dormido (Render free) o hay un 5xx,
 *   muestra un aviso con "Reintentar" en vez de sacar al usuario.
 * - Redirige con ?motivo=... para que el login pueda explicar qué pasó.
 * - Usa location.replace para que "Atrás" no vuelva a la página protegida.
 * - Si el rol no corresponde, manda al usuario a su inicio (no al login).
 */

import { fetchMe } from "../services/authService.js";
import { setCurrentUser } from "../state/session.js";

const LOGIN_URL = "/src/pages/auth/login.html";
const SESSION_KEY = "lectura-activa:user";

// Página de inicio por rol. Ajusta si cambian los nombres o los roles.
const ROLE_HOME = {
  student: "/src/pages/student/catalog/catalog.html",
  teacher: "/src/pages/teacher/dashboard-teacher.html",
  admin: "/src/pages/teacher/dashboard-teacher.html",
};

/**
 * ¿El fallo es de conexión/servidor (y no una sesión inválida)?
 * - fetch lanza TypeError si no hay red, hay bloqueo CORS o el servidor no responde.
 * - Un status >= 500 es un fallo del servidor.
 * Si el error no trae status ni es TypeError, se trata como sesión inválida
 * (mismo comportamiento que antes).
 */
function isTransientError(error) {
  const status = error?.status ?? error?.statusCode;
  if (typeof status === "number") return status === 0 || status >= 500;
  return error instanceof TypeError;
}

function clearLocalSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function goToLogin(motivo) {
  window.location.replace(`${LOGIN_URL}?motivo=${encodeURIComponent(motivo)}`);
}

function showConnectionError() {
  if (document.getElementById("auth-guard-error")) return;

  const box = document.createElement("div");
  box.id = "auth-guard-error";
  box.setAttribute("role", "alert");
  box.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;gap:12px;" +
    "align-items:center;justify-content:center;padding:12px 16px;" +
    "background:#fff3cd;color:#664d03;border-bottom:1px solid #ffecb5;" +
    "font:14px system-ui,sans-serif;";

  const text = document.createElement("span");
  text.textContent =
    "No se pudo conectar con el servidor. Tu sesión no se cerró; " +
    "puede tardar unos segundos si el servidor estaba dormido.";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Reintentar";
  button.addEventListener("click", () => window.location.reload());

  box.append(text, button);
  document.body.prepend(box);
}

function normalizePath(path) {
  return path.replace(/\.html$/, "").replace(/\/$/, "");
}

/**
 * Verifica que el usuario esté autenticado.
 * - Sin sesión (401): limpia la sesión local y redirige al login.
 * - Error de red/servidor: muestra aviso y NO cierra la sesión.
 * @returns {Promise<object|null>} usuario o null
 */
export async function requireLogin() {
  try {
    const user = await fetchMe();
    if (!user) {
      throw Object.assign(new Error("Respuesta sin usuario"), { status: 401 });
    }
    setCurrentUser(user); // refresca la sesión local
    return user;
  } catch (error) {
    if (isTransientError(error)) {
      console.error(
        "[authGuard] No se pudo verificar la sesión (red/servidor):",
        error
      );
      showConnectionError();
      return null;
    }

    console.warn(
      "[authGuard] Sesión no válida:",
      error?.status ?? error?.statusCode ?? "",
      error
    );
    clearLocalSession();
    goToLogin("sesion-expirada");
    return null;
  }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Si no lo tiene, lo manda a la página de inicio de su rol.
 * @param {string[]} allowedRoles
 * @returns {Promise<object|null>}
 */
export async function requireRole(allowedRoles = []) {
  const user = await requireLogin();
  if (!user) return null;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn("[authGuard] Rol no autorizado:", user.role);

    const home = ROLE_HOME[user.role];
    // Evita bucles: si ya estamos en la página de inicio de ese rol, al login.
    if (home && normalizePath(home) !== normalizePath(window.location.pathname)) {
      window.location.replace(home);
    } else {
      goToLogin("sin-permiso");
    }
    return null;
  }

  return user;
}