/**
 * apiClient.js
 * Cliente HTTP central para hablar con el backend.
 *
 * - Usa `credentials: 'include'` para enviar/recibir cookies de sesión.
 * - Lanza un error si la respuesta HTTP no es 2xx.
 * - Devuelve JSON o null (para respuestas 204).
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Hace una petición al backend.
 * @param {string} path - Ruta relativa, ej: '/me', '/readings'
 * @param {object} options - Opciones de fetch (method, body, headers...)
 * @returns {Promise<any>} - Respuesta parseada o null
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, headers, ...rest } = options;

  const finalOptions = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    ...rest,
  };

  // POST/PATCH/PUT siempre llevan body (aunque sea {})
  if (method !== 'GET' && method !== 'DELETE' && method !== 'HEAD') {
    finalOptions.body = body !== undefined ? JSON.stringify(body) : '{}';
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, finalOptions);
  } catch (networkError) {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  // 204 No Content: no hay body que parsear
  if (response.status === 204) {
    return null;
  }

  // Si no es 2xx, lanzar error con el mensaje del backend
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Error ${response.status}`;
    const code = errorBody?.error?.code || 'UNKNOWN_ERROR';
    const error = new Error(message);
    error.code = code;
    error.status = response.status;
    throw error;
  }

  // Respuesta normal
  return response.json();
}

/**
 * Atajos para no escribir tanto.
 */
export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};