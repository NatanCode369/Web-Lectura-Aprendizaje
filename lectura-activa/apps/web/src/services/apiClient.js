/**
 * apiClient.js
 * Cliente HTTP central para hablar con el backend.
 *
 * - Usa `credentials: 'include'` para enviar/recibir cookies de sesión.
 * - Lanza un error si la respuesta HTTP no es 2xx.
 * - Devuelve JSON o null (para respuestas 204).
 */

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";
let refreshRequest = null;

function createHttpError(response, errorBody) {
  const message = errorBody?.error?.message || `Error ${response.status}`;
  const error = new Error(message);
  error.code = errorBody?.error?.code || "UNKNOWN_ERROR";
  error.status = response.status;
  return error;
}

async function readErrorBody(response) {
  return response.json().catch(() => ({}));
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).finally(() => {
      refreshRequest = null;
    });
  }

  const response = await refreshRequest;
  if (!response.ok) {
    throw createHttpError(response, await readErrorBody(response));
  }
}

function redirectToLogin() {
  try {
    sessionStorage.removeItem("lectura-activa:user");
  } catch {
    // Storage may be unavailable in private or restricted browsing contexts.
  }
  window.location.replace(
    "/src/pages/auth/login.html?motivo=sesion-expirada",
  );
}

/**
 * Hace una petición al backend.
 * @param {string} path - Ruta relativa, ej: '/me', '/readings'
 * @param {object} options - Opciones de fetch (method, body, headers...)
 * @returns {Promise<any>} - Respuesta parseada o null
 */
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers, ...rest } = options;

  const finalOptions = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    ...rest,
  };

  // POST/PATCH/PUT siempre llevan body (aunque sea {})
  if (method !== "GET" && method !== "DELETE" && method !== "HEAD") {
    finalOptions.body = body !== undefined ? JSON.stringify(body) : "{}";
  }

  const url = `${API_URL}${path}`;
  let response;
  try {
    response = await fetch(url, finalOptions);
  } catch (networkError) {
    const error = new Error(
      "No se pudo conectar con el servidor. Verifica tu conexión.",
    );
    error.status = 0;
    throw error;
  }

  if (response.status === 401 && !path.includes("/auth/")) {
    try {
      await refreshSession();
      response = await fetch(url, finalOptions);
    } catch (refreshError) {
      if (refreshError.status === 401) {
        console.warn("[apiClient] Sesión expirada, redirigiendo al login...");
        redirectToLogin();
      }
      throw refreshError;
    }
  }

  // 204 No Content: no hay body que parsear
  if (response.status === 204) {
    return null;
  }

  // Si no es 2xx, lanzar error con el mensaje del backend
  if (!response.ok) {
    const error = createHttpError(response, await readErrorBody(response));

    if (response.status === 401 && !path.includes("/auth/")) {
      console.warn("[apiClient] Sesión expirada, redirigiendo al login...");
      redirectToLogin();
    }

    throw error;
  }

  // Respuesta normal
  return response.json();
}

/**
 * Atajos para no escribir tanto.
 */
export const api = {
  get: (path) => apiFetch(path, { method: "GET" }),
  post: (path, body) => apiFetch(path, { method: "POST", body }),
  patch: (path, body) => apiFetch(path, { method: "PATCH", body }),
  put: (path, body) => apiFetch(path, { method: "PUT", body }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
};
