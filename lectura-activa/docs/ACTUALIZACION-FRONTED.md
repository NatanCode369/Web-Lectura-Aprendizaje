# Cambios en el frontend del estudiante — Omar (P5)

**Autor:** Omar (P5 — Frontend del estudiante)
**Fecha:** 07 de Octubre, 2026
**Rama:** `ft/2023537`
**Relacionado con:** ADR 0004, ADR 0005, ADR 0006, `RESUMEN_BLOQUES_A_B.md`

---

## 1. Resumen ejecutivo

Se completó la integración del frontend del estudiante con el backend de Diego (P2), incluyendo:

- Flujo completo de **recuperación de contraseña** (forgot + reset).
- **Guardas de acceso** (`requireLogin`) en todas las pantallas protegidas.
- **Manejo de códigos de error** del backend (ADR 0006).
- **Redirección automática al login** cuando la sesión expira (401).
- **Eliminación de la validación de dominio fijo** `@kinal.edu.gt` del frontend, delegando esa responsabilidad al backend (whitelist).

---

## 2. Archivos modificados

| #   | Archivo                                              | Acción     | Motivo                                                             |
| --- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| 1   | `utils/validators.js`                                | Modificado | Se mantiene `isValidEmail`; se deja de usar `isInstitutionalEmail` |
| 2   | `services/apiClient.js`                              | Modificado | Redirección automática al login en 401                             |
| 3   | `utils/authGuard.js`                                 | **Nuevo**  | Guardas de acceso asíncronas (`requireLogin`, `requireRole`)       |
| 4   | `pages/auth/register.js`                             | Modificado | Sin `isInstitutionalEmail`; manejo de códigos de error             |
| 5   | `pages/auth/forgot-password.js`                      | Modificado | Sin `isInstitutionalEmail`; usa `isValidEmail`                     |
| 6   | `pages/auth/reset-password.js`                       | Modificado | Con validaciones de token y contraseña                             |
| 7   | `pages/student/catalog/catalog.js`                   | Modificado | Añadido `requireLogin`                                             |
| 8   | `pages/student/my-tasks/my-tasks.js`                 | Modificado | Añadido `requireLogin`                                             |
| 9   | `pages/student/reading-detail/reading-detail.js`     | Modificado | Añadido `requireLogin`                                             |
| 10  | `pages/student/reading-activity/reading-activity.js` | Modificado | Añadido `requireLogin`                                             |
| 11  | `pages/student/feedback/feedback.js`                 | Modificado | Añadido `requireLogin`                                             |
| 12  | `pages/student/my-progress/my-progress.js`           | Modificado | Añadido `requireLogin`                                             |

---

## 3. Cambios detallados por archivo

### 3.1 `utils/validators.js`

**Antes:** Se usaba `isInstitutionalEmail` para validar el dominio `@kinal.edu.gt`.

**Ahora:** Se usa `isValidEmail` (formato general). La validación del dominio institucional la hace el backend (whitelist en MongoDB según ADR 0006).

**Razón:** El backend ahora acepta cualquier dominio que esté registrado en la colección `institutions`. El frontend no debe asumir que solo `@kinal.edu.gt` es válido.

---

### 3.2 `services/apiClient.js`

**Cambio añadido:**

```javascript
if (!response.ok) {
  const errorBody = await response.json().catch(() => ({}));
  const message = errorBody?.error?.message || `Error ${response.status}`;
  const code = errorBody?.error?.code || 'UNKNOWN_ERROR';
  const error = new Error(message);
  error.code = code;
  error.status = response.status;

  // Si es 401 y no es una ruta de auth, redirigir al login
  if (response.status === 401 && !path.includes('/auth/')) {
    console.warn('[apiClient] Sesión expirada, redirigiendo al login...');
    try {
      sessionStorage.removeItem('lectura-activa:user');
    } catch (e) {}
    window.location.href = '/src/pages/auth/login.html';
  }

  throw error;
}

3.3 utils/authGuard.js (NUEVO)
Propósito: Guardas de acceso asíncronas que verifican contra el backend (GET /me).

Funciones:

requireLogin() — Verifica que el usuario esté autenticado. Si no, redirige al login. Devuelve el usuario o null.

requireRole(allowedRoles) — Verifica que el usuario tenga uno de los roles permitidos.

Diferencia con session.js:

session.js tiene un requireLogin() síncrono que solo verifica sessionStorage (rápido pero no verifica la cookie).

authGuard.js tiene un requireLogin() asíncrono que llama a fetchMe() (verifica la cookie contra el backend).

Uso:
import { requireLogin } from "../../../utils/authGuard.js";

function init() {
  requireLogin().then((user) => {
    if (!user) return; // redirigido al login
    loadData();
  });
}

3.4 pages/auth/register.js
Cambios:

Se eliminó isInstitutionalEmail y se usa isValidEmail.

Se añadió manejo de códigos de error del backend:

EMAIL_ALREADY_EXISTS → "Ya existe una cuenta con ese correo."

WEAK_PASSWORD → "La contraseña no cumple con los requisitos de seguridad."

DOMAIN_NOT_ALLOWED → "Tu dominio de correo no está autorizado."

Razón: El backend (ADR 0006) devuelve códigos específicos. El frontend debe mostrar mensajes precisos al usuario.

3.5 pages/auth/forgot-password.js
Cambios:

Se eliminó isInstitutionalEmail y se usa isValidEmail.

Se conecta al endpoint POST /auth/forgot-password con { email }.

Muestra mensaje genérico: "Si el correo está registrado, recibirás un enlace en unos minutos."

Razón: El backend siempre devuelve { ok: true } por seguridad (no revela si el email existe o no). El frontend debe mostrar un mensaje genérico.

3.6 pages/auth/reset-password.js
Cambios:

Captura el token del query string (?token=abc123).

Valida que la contraseña tenga mínimo 8 caracteres.

Valida que las dos contraseñas coincidan.

Llama a resetPassword({ token, newPassword }).

Redirige al login después de 2 segundos en caso de éxito.

Maneja errores específicos (INVALID_RESET_TOKEN, WEAK_PASSWORD).

Razón: El backend (ADR 0005) usa un token propio de 64 caracteres hex que llega en el query string.

3.7 pages/student/catalog/catalog.js (y demás pantallas)
Cambio en init():
function init() {
  console.info("[catalog] Pantalla cargada.");
  requireLogin().then((user) => {
    if (!user) return; // redirigido al login
    loadReadings();
  });
}
Razón: Todas las pantallas del estudiante deben verificar que el usuario esté autenticado antes de cargar datos. Si la cookie expiró, requireLogin() redirige al login.

Pantallas afectadas:
catalog.js
my-tasks.js
reading-detail.js
reading-activity.js
feedback.js
my-progress.js


4. Flujo completo de autenticación
4.1 Registro
Usuario llena register.html con nombre, correo y contraseña.
Frontend valida localmente (isValidEmail, validatePassword, validatePasswordMatch).
Frontend llama a POST /auth/register.
Backend crea usuario en Supabase + Mongo (con rol según whitelist).
Frontend redirige al login.

4.2 Login
Usuario llena login.html con correo y contraseña.
Frontend valida localmente (isValidEmail, longitud de contraseña).
Frontend llama a POST /auth/login.
Backend valida credenciales, crea cookies HttpOnly, devuelve usuario con role.
Frontend redirige según rol:
student → catalog.html
teacher / admin → dashboard-teacher.html
4.3 Recuperar contraseña
Usuario va a forgot-password.html e ingresa su correo.

Frontend llama a POST /auth/forgot-password.

Backend genera token de 64 caracteres hex, lo guarda hasheado en Mongo, y construye el link:
http://localhost:5173/src/pages/auth/reset-password.html?token=...

En dev (MAILER_MODE=console): el link se loguea en la consola del backend.
En prod (MAILER_MODE=resend): el correo se envía de verdad al usuario.
Usuario hace clic en el link → llega a reset-password.html?token=....
Usuario ingresa nueva contraseña y confirma.
Frontend valida localmente (mínimo 8 caracteres, coincidencia).
Frontend llama a POST /auth/reset-password con { token, newPassword }.
Backend valida token, actualiza contraseña en Supabase, marca token como usado.
Frontend muestra éxito y redirige al login.

4.4 Guardas de acceso
Usuario intenta abrir catalog.html sin estar logueado.

requireLogin() llama a GET /me.

Backend devuelve 401 (no hay cookie válida).
apiClient.js detecta el 401 y redirige al login.
Usuario es redirigido a login.html.


5. Códigos de error manejados
Código	Origen	Dónde se maneja	Mensaje al usuario
EMAIL_ALREADY_EXISTS	Backend (register)	register.js	"Ya existe una cuenta con ese correo."
WEAK_PASSWORD	Backend (register/reset)	register.js, reset-password.js	"La contraseña no cumple con los requisitos de seguridad."
DOMAIN_NOT_ALLOWED	Backend (register)	register.js	"Tu dominio de correo no está autorizado."
INVALID_RESET_TOKEN	Backend (reset)	reset-password.js	"El enlace es inválido o ha expirado. Solicita uno nuevo."
401	Backend	apiClient.js, login.js	Redirige al login / "Correo o contraseña incorrectos."
403	Backend	register.js, login.js	"Tu dominio de correo no está autorizado."
409	Backend	register.js	"Ya existe una cuenta con ese correo."
429	Backend	login.js	"Demasiados intentos. Espera un momento."
503	Backend	login.js, reset-password.js	"El servicio no está disponible. Intenta más tarde."


6. Estado de las pantallas
Pantalla	Fase	Estado	Notas
Login	1	✅ Completa	Redirige según rol
Registro	1	✅ Completa	Maneja códigos de error
Recuperar contraseña	1	✅ Completa	Conectado al backend
Resetear contraseña	1	✅ Completa	Valida token + contraseña
Catálogo	1	✅ Completa	Con requireLogin
Detalle de lectura	1	✅ Completa	Con requireLogin
Mis tareas	2	✅ Completa	Con requireLogin
Lectura + actividades	2	✅ Completa	Con requireLogin
Retroalimentación	2	✅ Completa	Con requireLogin
Mi progreso	2	✅ Completa	Con requireLogin

8.3 Pruebas
Registro: register.html → correo institucional → debe redirigir al login.

Login: login.html → credenciales → debe redirigir al catálogo (si es student).

Guarda de acceso: Abrir catalog.html sin login → debe redirigir al login.

Recuperar contraseña: forgot-password.html → correo → revisar consola del backend para el link.

Resetear contraseña: Copiar link del backend → abrirlo → nueva contraseña → debe redirigir al login.

Validaciones: Probar contraseña corta, contraseñas diferentes, token inválido.


9. Dependencias con otros módulos
Módulo	Dependencia	Estado
auth	Endpoints /auth/login, /auth/register, /auth/forgot-password, /auth/reset-password, /auth/logout, /me	✅ Implementados por Diego
readings	Endpoint GET /readings y GET /readings/:id	⚠️ Depende de Adrián (migración pendiente)
assignments	Endpoints GET /assignments/mine, GET /assignments/mine/:id, POST /assignments/:id/start	⚠️ Depende de Aaron (migración pendiente)
analytics	Endpoints de progreso	⚠️ Depende de Aaron

10. Contacto
Dueño del frontend: Omar (P5)
Revisores: P1 (Líder técnico), José (P6)
Cambios a este documento: requieren PR + aviso al equipo

```
