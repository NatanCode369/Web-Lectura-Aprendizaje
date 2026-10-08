# Notas para Omar (P5) — Flujo de reset-password implementado

**Autor:** Diego (P2 — Backend de identidad y usuarios)
**Fecha:** 07 de Octubre, 2026
**Dirigido a:** Omar (P5 — Frontend estudiante)
**Relacionado con:** ADR 0005, endpoint-reset-password.md

---

## 1. Respuesta directa a tus preguntas

### ❓ "¿Cómo va a llegar el usuario a mi `reset-password.html`? ¿Supabase redirige con `?code=` o con `#access_token=`?"

**Ninguna de las dos.** En este proyecto **NO usamos el flujo estándar de Supabase** para reset-password. Usamos un **token propio del backend**.

**El usuario llega así:**

```
http://localhost:5173/src/pages/auth/reset-password.html?token=25a11fd160b737e3896446987a519f1ddb5f464ff473d6c1742cf9038afa7f98
```

**Fíjate en el formato del token:**
- ✅ **Query string con `?token=`** (no `?code=` ni `#access_token=`).
- ✅ **64 caracteres hex** (0-9, a-f).
- ✅ **Sin fragmento** (nada de `#`).

### ❓ "¿El backend va a manejar el intercambio de ese código, o el frontend debe usar el SDK de Supabase directamente?"

**El backend maneja todo.** El frontend **NO necesita el SDK de Supabase** para este flujo.

**El frontend solo hace 2 cosas:**
1. **Capturar** el token del query string: `?token=abc123...`
2. **Enviarlo** al backend con `POST /api/v1/auth/reset-password`.

**El backend:**
- Valida el token contra MongoDB (`passwordResets`).
- Actualiza la contraseña en Supabase con `supabaseAdmin.auth.admin.updateUserById`.
- Devuelve `{ ok: true, message: "Contraseña actualizada correctamente." }`.

---

## 2. Por qué NO usamos el flujo estándar de Supabase

**El flujo estándar de Supabase (`resetPasswordForEmail`) envía el token en el fragmento:**
```
#access_token=eyJ...&type=recovery
```

**Tu `reset-password.js` captura el token con:**
```js
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
```

**`window.location.search` solo lee el query string (`?`), NO el fragmento (`#`).** Entonces, si usáramos Supabase directamente, **tu código actual no funcionaría**.

**Decisión (ADR 0005):** implementar un **token propio** con el formato que tu código ya espera (`?token=abc123`).

---

## 3. Lo que ya está hecho (backend)

### Endpoints

| Endpoint | Método | Estado |
|---|---|---|
| `/api/v1/auth/forgot-password` | POST | ✅ Implementado |
| `/api/v1/auth/reset-password` | POST | ✅ Implementado |

### Flujo completo

```
1. Usuario ingresa su email en /forgot-password.
   ↓
2. Frontend → POST /api/v1/auth/forgot-password { email }
   ↓
3. Backend:
   a. Verifica que el dominio sea institucional.
   b. Verifica que el usuario exista en Supabase.
   c. Genera token de 64 caracteres hex.
   d. Guarda hash SHA-256 en colección `passwordResets` (TTL 15 min).
   e. Construye link: http://localhost:5173/src/pages/auth/reset-password.html?token=<token>
   f. Envía correo (en dev: loguea en consola; en prod: vía Resend).
   ↓
4. Usuario hace clic en el link → llega a reset-password.html?token=abc123
   ↓
5. Frontend → POST /api/v1/auth/reset-password { token, newPassword }
   ↓
6. Backend:
   a. Valida formato del token (64 hex).
   b. Valida fortaleza de la contraseña (>= 8).
   c. Busca el token hasheado en Mongo.
   d. Verifica que no esté expirado ni usado.
   e. Actualiza la contraseña en Supabase.
   f. Marca el token como usado.
   ↓
7. Frontend recibe { ok: true, message } y redirige al login.
```

### Contratos exactos

**`POST /api/v1/auth/forgot-password`**

Request:
```json
{ "email": "usuario@colegiodemo.edu.gt" }
```

Response (200, siempre):
```json
{ "ok": true }
```

Errores posibles:
- `400 VALIDATION_ERROR` — body inválido.
- `503 AUTH_NOT_CONFIGURED` — Supabase no configurado.

**`POST /api/v1/auth/reset-password`**

Request:
```json
{
  "token": "25a11fd160b737e3896446987a519f1ddb5f464ff473d6c1742cf9038afa7f98",
  "newPassword": "nuevaPassword123"
}
```

Response (200):
```json
{
  "ok": true,
  "message": "Contraseña actualizada correctamente."
}
```

Errores posibles:
- `400 VALIDATION_ERROR` — token no tiene 64 chars hex, o newPassword < 8 chars.
- `400 INVALID_RESET_TOKEN` — token inválido, expirado o ya usado.
- `400 WEAK_PASSWORD` — contraseña < 8 chars (ya validado en schema).
- `500 RESET_PASSWORD_FAILED` — error de Supabase.
- `503 AUTH_NOT_CONFIGURED` — Supabase no configurado.

---

## 4. Lo que el frontend (tú) tiene que hacer

### 4.1 `forgot-password.js`

**Debe hacer:**

```js
import { api } from "../../services/apiClient.js";

const form = document.getElementById("forgot-form");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();

  formError.textContent = "";
  formSuccess.textContent = "";

  try {
    await api.post("/auth/forgot-password", { email });
    formSuccess.textContent = "Si el correo está registrado, recibirás un enlace en unos minutos.";
    form.reset();
  } catch (err) {
    formError.textContent = err?.message ?? "No pudimos enviar el correo. Intenta de nuevo.";
  }
});
```

**Importante:** el mensaje de éxito debe ser **genérico** ("Si el correo está registrado...") para no revelar si el email existe o no. Esto lo pide el propio backend (siempre devuelve `{ ok: true }`).

### 4.2 `reset-password.js`

**Debe hacer:**

```js
import { validatePassword, validatePasswordMatch } from "../../utils/validators.js";
import { resetPassword } from "../../services/authService.js";

const form = document.getElementById("reset-form");
const passwordInput = document.getElementById("new-password");
const passwordConfirmInput = document.getElementById("new-password-confirm");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

// Extraer el token del query string (?token=abc123)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (!token) {
  formError.textContent = "Enlace inválido o expirado. Solicita uno nuevo.";
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  formError.textContent = "";
  formSuccess.textContent = "";

  const newPassword = passwordInput.value;
  const confirmPassword = passwordConfirmInput.value;

  // Validaciones locales
  if (!validatePassword(newPassword)) {
    formError.textContent = "La contraseña debe tener al menos 8 caracteres.";
    return;
  }

  if (!validatePasswordMatch(newPassword, confirmPassword)) {
    formError.textContent = "Las contraseñas no coinciden.";
    return;
  }

  try {
    await resetPassword({ token, newPassword });
    formSuccess.textContent = "Contraseña actualizada correctamente. Redirigiendo al login...";

    setTimeout(() => {
      window.location.href = "/src/pages/auth/login.html";
    }, 2000);
  } catch (err) {
    formError.textContent =
      err?.message ?? "No pudimos actualizar la contraseña. Intenta de nuevo.";
  }
});
```

**Nota:** tu `authService.js` ya tiene `resetPassword({ token, newPassword })` implementado. **No hay que cambiarlo.**

### 4.3 Manejo de errores específicos

El backend devuelve errores con códigos específicos. El frontend puede manejarlos así:

| Código | Mensaje al usuario |
|---|---|
| `INVALID_RESET_TOKEN` | "El enlace es inválido o ha expirado. Solicita uno nuevo." |
| `WEAK_PASSWORD` | "La contraseña debe tener al menos 8 caracteres." |
| `VALIDATION_ERROR` | "Los datos enviados no son válidos." |
| `RESET_PASSWORD_FAILED` | "No pudimos actualizar la contraseña. Intenta de nuevo." |
| `AUTH_NOT_CONFIGURED` | "El servicio no está disponible. Intenta más tarde." |

**Cómo leer el código de error** depende de cómo esté implementado tu `apiClient.js`. Si necesitas ayuda con eso, avísame.

---

## 5. Estado actual del flujo (verificado end-to-end)

Todo funciona. Lo probé con:

**1. Registro de usuario de prueba:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -d '{"email":"reset-test@kinal.edu.gt","password":"password123","fullName":"Reset Test"}'
# → {"user":{"id":"...","email":"reset-test@kinal.edu.gt"}}
```

**2. Solicitar reset:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -d '{"email":"reset-test@kinal.edu.gt"}'
# → {"ok":true}
```

**3. En la terminal del backend aparece el correo simulado:**
```
📧 EMAIL SIMULADO (console)
To:      reset-test@kinal.edu.gt
Link:    http://localhost:5173/src/pages/auth/reset-password.html?token=25a11fd160b737e3896446987a519f1ddb5f464ff473d6c1742cf9038afa7f98
```

**4. Cambiar contraseña:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -d '{"token":"25a11fd160b737e3896446987a519f1ddb5f464ff473d6c1742cf9038afa7f98","newPassword":"nuevaPassword123"}'
# → {"ok":true,"message":"Contraseña actualizada correctamente."}
```

**5. Login con la nueva contraseña:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -d '{"email":"reset-test@kinal.edu.gt","password":"nuevaPassword123"}'
# → 200 con { user: {...} }
```

**6. Reusar el mismo token (debe fallar):**
```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -d '{"token":"25a11fd160b737e3896446987a519f1ddb5f464ff473d6c1742cf9038afa7f98","newPassword":"otraPassword456"}'
# → 400 INVALID_RESET_TOKEN "Este enlace ya fue usado."
```

---

## 6. Lo que tienes pendiente en el frontend

Marca lo que aplique:

- [ ] **`forgot-password.js`** — Verificar que llama a `POST /api/v1/auth/forgot-password` con `{ email }` y muestra un mensaje genérico.
- [ ] **`reset-password.js`** — Verificar que:
  - [ ] Captura `token` de `?token=...`
  - [ ] Valida la contraseña localmente (mínimo 8 chars).
  - [ ] Valida que las 2 contraseñas coincidan.
  - [ ] Llama a `resetPassword({ token, newPassword })`.
  - [ ] Muestra mensajes de error específicos según el código.
  - [ ] Redirige a login en éxito.
- [ ] **`authService.js`** — Verificar que `resetPassword` esté así:
  ```js
  export async function resetPassword({ token, newPassword }) {
    return api.post("/auth/reset-password", { token, newPassword });
  }
  ```
- [ ] **`apiClient.js`** — Verificar que maneja errores del backend y expone el `code` para que el frontend pueda reaccionar.
- [ ] **Mensajes en español neutro** — Revisar todos los textos de error/éxito.

---

## 7. En producción (cuando P7 configure el mailer)

**Cambio necesario en las variables de entorno de Cloud Run / Vercel:**

```
MAILER_MODE=resend
RESEND_API_KEY=re_xxxxx  (generar en resend.com)
MAILER_FROM=noreply@tudominio.com  (verificar dominio en Resend)
```

**En desarrollo (tu máquina):**

```
MAILER_MODE=console
```

**Diferencia:**
- `console` → el correo se loguea en la consola del backend. **Tú lo ves, no se envía nada.**
- `resend` → el correo se envía realmente al usuario.

**Para probar en local**, puedes ver el link con el token en la terminal del backend sin configurar nada.

---

## 8. Contacto

- **Dueño del backend:** Diego (P2)
- **Dueño del frontend:** Omar (P5)
- **Revisores:** P1, P7
- **Cambios a este flujo:** requieren ADR nuevo + aviso al equipo