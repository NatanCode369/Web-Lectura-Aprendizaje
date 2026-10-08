# Especificación: Endpoint `POST /api/v1/auth/reset-password`

**Autor:** Omar (P5 — Frontend estudiante)
**Dirigido a:** Diego (P2 — Backend de identidad y usuarios)
**Fecha:** 07 de Octubre, 2026
**Relacionado con:** ADR 0004 (Bearer JWT + Cookie HttpOnly)

---

## 1. Contexto

El flujo de recuperación de contraseña tiene dos pasos:

1. El usuario ingresa su correo en `forgot-password.html`.
2. El backend envía un enlace al correo con un **token de recuperación**.
3. El usuario hace clic en el enlace y llega a `reset-password.html?token=abc123`.
4. El frontend envía el token y la nueva contraseña al backend.
5. El backend valida el token y actualiza la contraseña en Supabase.

Actualmente, el endpoint `POST /auth/forgot-password` solo envía el enlace. **Falta el endpoint que recibe el token y la nueva contraseña.**

---

## 2. Endpoint solicitado

| Campo             | Valor                                                     |
| ----------------- | --------------------------------------------------------- |
| **Método**        | `POST`                                                    |
| **Ruta**          | `/api/v1/auth/reset-password`                             |
| **Autenticación** | No requiere JWT (el token del correo es la autenticación) |
| **Content-Type**  | `application/json`                                        |

---

## 3. Request (lo que envía el frontend)

```json
{
  "token": "abc123-def456-ghi789",
  "newPassword": "nuevaContraseña123"
}

## 4. Response (lo que devuelve el backend)
4.1 Éxito (200 OK)

{
  "ok": true,
  "message": "Contraseña actualizada correctamente."
}

4.2 Error (400 Bad Request — token inválido o expirado)
{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "El enlace de recuperación es inválido o ha expirado.",
    "requestId": "req-abc123"
  }
}

4.3 Error (422 Unprocessable Entity — contraseña débil)
{
  "error": {
    "code": "WEAK_PASSWORD",
    "message": "La contraseña debe tener al menos 8 caracteres.",
    "requestId": "req-abc124"
  }
}

4.4 Error (500 Internal Server Error)
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "No pudimos actualizar la contraseña. Intenta de nuevo.",
    "requestId": "req-abc125"
  }
}

5. Lógica interna sugerida (para Diego)
Validar que token y newPassword estén presentes.

Validar que newPassword tenga al menos 8 caracteres.

Usar el SDK de Supabase para validar el token y actualizar la contraseña:

const { data, error } = await supabase.auth.updateUser({
  password: newPassword
});

6. Alternativa: Usar Supabase directamente desde el frontend
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// En reset-password.js
const { error } = await supabase.auth.updateUser({
  password: newPassword
});

7. Checklist para Diego
 Crear ruta POST /api/v1/auth/reset-password en el módulo auth.
□ Validar token y newPassword en el body.
□ Validar fortaleza de la contraseña (mínimo 8 caracteres).
□ Integrar con Supabase Auth para actualizar la contraseña.
□ Manejar errores: token inválido (400), contraseña débil (422), error interno (500).
□ Devolver { ok: true, message: "..." } en éxito.
□ Avisar a Omar (P5) cuando esté listo para probar el flujo completo.

8. Contacto
Solicitante: Omar (P5 — Frontend estudiante)

Implementador: Diego (P2 — Backend de identidad y usuarios)

Revisor: P1 (Líder técnico)


---

## 📋 Resumen de lo que tienes que hacer

| Acción | Archivo | Ubicación |
|---|---|---|
| Reemplazar | `reset-password.js` | `pages/auth/` |
| Actualizar | `authService.js` (agregar `resetPassword`) | `services/` |
| Enviar a Diego | `ESPECIFICACION_ENDPOINT_RESET_PASSWORD.md` | `docs/` o chat |

---

## 🎯 Flujo completo una vez Diego implemente el endpoint

1. Usuario va a `forgot-password.html` → ingresa correo → backend envía enlace.
2. Usuario hace clic en el enlace del correo → llega a `reset-password.html?token=abc123`.
3. Usuario ingresa nueva contraseña → `reset-password.js` llama a `resetPassword({ token, newPassword })`.
4. Backend valida token y actualiza contraseña en Supabase.
5. Frontend redirige al login con mensaje de éxito.

---

¿Quieres que te ayude también con el `apiClient.js` para asegurar que las cookies funcionen correctamente? Dime y seguimos. 🚀
```
