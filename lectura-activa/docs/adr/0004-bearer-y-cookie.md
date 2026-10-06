# ADR 0004 — Autenticación con Bearer JWT + Cookie HttpOnly

- **Estado:** Propuesto
- **Fecha:** 06 de Octubre, 2026
- **Responsable:** Diego (P2 — Backend de identidad y usuarios)
- **Revisores:** P1 (Líder técnico), P7 (Plataforma y seguridad), P5 (Frontend estudiante)
- **Relacionado con:** ADR 0001 (auth híbrida Supabase + Mongo)

## Contexto

El ADR 0001 estableció que la sesión se transmite vía `Authorization: Bearer <JWT>` (Opción B2). El frontend del estudiante (P5) ahora propone usar cookies HttpOnly para que el navegador envíe el JWT automáticamente y el cliente no manipule tokens.

Ambos enfoques tienen ventajas:

- **Bearer header:**
  - No requiere protección CSRF (el navegador no envía el header automáticamente).
  - Los tests e2e pueden simular sesiones sin manejar cookies.
  - Útil para clientes no-navegador (CLI, móvil).

- **Cookie HttpOnly:**
  - Inmune a XSS (el JavaScript del frontend no puede leer la cookie).
  - El frontend no maneja tokens (menos superficie de error).
  - Requiere protección CSRF en endpoints mutables.

Forzar una sola opción obligaría a renunciar a las ventajas de la otra. Por eso se propone **soportar ambas simultáneamente**.

## Decisión

El middleware `authenticate.js` **acepta el JWT por dos vías**, en este orden:

1. **Header `Authorization: Bearer <JWT>`** — tiene prioridad.
2. **Cookie `sb-access-token`** — se usa si no hay header.

```js
let authToken = null;

// 1. Header Bearer (prioridad)
const header = req.headers.authorization ?? '';
const [scheme, token] = header.split(' ');
if (scheme === 'Bearer' && token) {
  authToken = token;
}

// 2. Cookie HttpOnly (fallback)
if (!authToken) {
  authToken = req.cookies?.['sb-access-token'];
}

if (!authToken) {
  // 401 UNAUTHENTICATED
}
```

El login (`POST /api/v1/auth/login`) **crea las cookies HttpOnly** y **también** devuelve el access token en el body por si un cliente lo necesita (ej. tests, CLI).

## Endpoints afectados

Se añaden cuatro endpoints al módulo `auth`:

| Endpoint | Método | Efecto |
|---|---|---|
| `/api/v1/auth/login` | POST | Valida credenciales, crea cookies, devuelve user |
| `/api/v1/auth/register` | POST | Valida dominio, crea usuario en Supabase |
| `/api/v1/auth/logout` | POST | Borra cookies |
| `/api/v1/auth/forgot-password` | POST | Genera link de recuperación |

## Cookies utilizadas

| Cookie | Contenido | Max-Age | HttpOnly | Secure | SameSite |
|---|---|---|---|---|---|
| `sb-access-token` | JWT de Supabase | 1 hora | ✅ | ✅ prod | Lax |
| `sb-refresh-token` | Refresh token | 7 días | ✅ | ✅ prod | Lax |

`secure: true` solo en producción. En desarrollo se permite HTTP local.

## Seguridad

### CSRF

Al aceptar cookies, los endpoints mutables (POST/PATCH/PUT/DELETE) quedan expuestos a CSRF. Mitigaciones:

1. **`SameSite: Lax`** — el navegador no envía la cookie en peticiones cross-site (excepto navegación top-level GET). Esto bloquea la mayoría de ataques CSRF modernos.
2. **CORS estricto** — solo se permite el origen del frontend (lista `CORS_ORIGINS`).
3. **Rate limiting** en `/auth/*` (a definir en Fase 1).
4. **En Fase 2** (si el equipo lo considera necesario): añadir double-submit cookie o cabecera `X-CSRF-Token`.

### XSS

La cookie `HttpOnly` no es accesible desde JavaScript del navegador, así que un XSS no puede robar el JWT directamente. Esto es una mejora respecto a guardar el token en `localStorage`.

### Rotación

El access token expira en 1 hora. El refresh token en 7 días. Cuando el access expira, el frontend debe llamar a un endpoint `POST /auth/refresh` (**pendiente de implementar en Fase 2**) que regenera las cookies.

## Consecuencias

### Positivas

- El frontend estudiante usa cookies sin que el equipo renuncie a Bearer.
- Los tests e2e siguen funcionando con `Authorization: Bearer`.
- Compatible con clientes no-navegador (CLI, apps móviles futuras).
- Cookie HttpOnly protege contra XSS.

### Negativas

- Se requiere instalar `@fastify/cookie`.
- Los endpoints mutables ahora requieren protección CSRF (aunque `SameSite=Lax` mitiga el riesgo para el 95% de los casos).
- El middleware tiene que leer dos fuentes de token (más código).
- El refresh automático del token es responsabilidad del frontend.

### Neutras

- El JWT sigue siendo de Supabase Auth (ADR 0001 no cambia).
- El rol sigue viviendo en Mongo (ADR 0003 no cambia).
- Los tests e2e pueden seguir usando Bearer.

## Alternativas descartadas

### Solo Bearer (rechazada)
- Ignora la petición de P5.
- El frontend tendría que gestionar el token manualmente.

### Solo Cookie (rechazada)
- Rompe los tests e2e que usan Bearer.
- Incompatible con clientes no-navegador.
- Requiere CSRF obligatorio.

### Guardar el JWT en localStorage (rechazada)
- Vulnerable a XSS.
- Es lo que intenta evitar la propuesta de P5.

## Pendientes para Fase 2

- `POST /api/v1/auth/refresh` — regenerar cookies cuando expira el access token.
- `POST /api/v1/auth/verify-email` — endpoint para verificar correo (si Supabase no lo maneja automáticamente).
- Doble protección CSRF si el equipo lo considera necesario (dobles cookies o tokens sincronizados).

## Referencias

- `CONTEXTO_TECNICO.md` §2, §7, §8
- `docs/adr/0001-auth-supabase-mongodb.md`
- `docs/adr/0003-modelo-entidades-base.md`
- Documento de P5: "Cambios necesarios en el módulo auth" (06-Oct-2026)
- [Supabase Auth — Server-Side Auth](https://supabase.com/docs/guides/auth/server-side)