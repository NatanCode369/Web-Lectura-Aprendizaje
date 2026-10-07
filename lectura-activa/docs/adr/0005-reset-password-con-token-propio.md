# ADR 0005 — Reset de contraseña con token propio

- **Estado:** Aceptado
- **Fecha:** 07 de Octubre, 2026
- **Responsable:** Diego (P2 — Backend de identidad y usuarios)
- **Revisores:** P1 (Líder técnico), P7 (Plataforma y seguridad), P5 (Frontend estudiante)
- **Relacionado con:** ADR 0001, ADR 0004

## Contexto

El flujo de recuperación de contraseña requiere:
1. El usuario ingresa su correo en `/forgot-password`.
2. Recibe un correo con un enlace que contiene un token.
3. Hace clic en el enlace, llega a `/reset-password?token=...`.
4. Envía el token + la nueva contraseña al backend.
5. El backend valida el token y actualiza la contraseña.

**Supabase Auth ofrece `resetPasswordForEmail`**, que genera un enlace con el `access_token` en el **fragmento de la URL** (`#access_token=...&type=recovery`), no en el query string (`?token=`).

**El frontend del estudiante (P5) captura el token del query string** (`?token=abc123`), no del fragmento. Esto significa que **el flujo estándar de Supabase no es compatible con el frontend actual**.

## Decisión

Se adopta un **flujo de token propio**:

1. **`forgot-password`** genera un token aleatorio de 32 bytes (64 caracteres hex).
2. Lo guarda en la colección `passwordResets` **hasheado con SHA-256** (nunca en claro).
3. Construye un link `FRONTEND_URL/reset-password?token=<token>`.
4. Envía el correo con `MAILER_MODE` (`console` en dev, `resend` en prod).
5. **`reset-password`** recibe `{ token, newPassword }`, valida el token y actualiza la contraseña con `supabaseAdmin.auth.admin.updateUserById`.

## Detalles técnicos

### Colección `passwordResets`

```js
{
  _id: ObjectId,
  email: String,
  tokenHash: String,     // SHA-256 del token
  expiresAt: Date,       // 15 minutos por defecto
  usedAt: Date | null,
  createdAt: Date,
  requestIp: String | null,
}