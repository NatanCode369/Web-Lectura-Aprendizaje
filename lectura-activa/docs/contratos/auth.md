# Notas de P2 (Diego) — Fase 1

**Autor:** Diego (P2 — Backend de identidad y usuarios)
**Fecha:** 05 de Octubre, 2026
**Basado en:** `CONTEXTO_TECNICO.md`, ADRs 0001-0003, auditoría `REVIEW_CRITICA.md`

---

## 1. Objetivo de esta fase

Resolver el problema de **duplicidad de estrategias de autenticación** señalado por la auditoría, consolidando todo en un único flujo, alineado con la convención `request.user` que ya usa el resto del equipo.

---

## 2. Contexto del problema

### Duplicidad detectada

Existían **tres flujos de autenticación en paralelo**:

| Flujo | Archivo | Convención | Lazy provisioning | Uso actual |
|---|---|---|---|---|
| A | `shared/auth.js` (`buildAuth`) | `request.user` | ❌ No | `server.js`, `readings` |
| B | `shared/auth/session.js` (`requireSession`) | `request.user` | ❌ Stub vacío | `analytics`, `assignments`, `attempts`, `groups`, `studentAssignments` |
| C | `shared/middleware/authenticate.js` (mío) | `req.auth` | ✅ Sí | Nadie lo usaba |

### Inconsistencias colaterales

Además del problema de duplicidad, se detectaron **3 convenciones distintas** para referirse al usuario autenticado:

- `user._id` — usado en `reading.service.js` (ObjectId de Mongo).
- `user.authUserId` — usado en `policies.js` (string de Supabase).
- `user.userId` — usado en `analytics.service.js` (campo inexistente).

---

## 3. Decisión tomada

**Consolidar en un único flujo con convención `request.user`.**

### Contrato final

`request.user` = **objeto completo de Mongo**, con todos los campos del documento:

```js
{
  _id: ObjectId,              // ID interno de Mongo
  authUserId: String,          // ID de Supabase (sub del JWT)
  email: String,               // Minúsculas
  fullName: String | null,
  role: 'student' | 'teacher' | 'admin',
  institutionId: ObjectId,
  status: 'active' | 'suspended' | 'deleted',
  profile: { avatarUrl, preferences },
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null
}
```

**Ventajas de esta decisión:**
- `readings` (usa `user._id`) sigue funcionando sin cambios.
- `policies.js` (usa `user.authUserId`) sigue funcionando sin cambios.
- Solo hay que corregir `analytics.service.js` (usar `_id` en lugar de `userId`).
- Cumple ADR 0001 (lazy provisioning).
- Cumple ADR 0003 (rol vive en Mongo, no en JWT).

---

## 4. Cambios realizados (alcance de P2)

### 4.1 — Reescribir `shared/middleware/authenticate.js`

**Antes:** guardaba `req.auth = { userId, role, institutionId }`.
**Ahora:** guarda `request.user = appUser` (objeto completo de Mongo).

**Flujo del middleware:**
1. Guard: si Supabase no está configurado → `503 AUTH_NOT_CONFIGURED`.
2. Extraer Bearer token del header `Authorization`.
3. Validar JWT contra Supabase Auth (`supabaseAuth.auth.getUser(token)`).
4. Llamar a `authService.ensureUserFromJwt(claims)` → lazy provisioning + defensa de dominio.
5. Inyectar `request.user` con el documento completo de Mongo.

**Manejo de errores:**
- Sin token → `401 UNAUTHENTICATED`.
- Token inválido → `401 INVALID_TOKEN`.
- Dominio no autorizado → `403 DOMAIN_NOT_ALLOWED`.
- Supabase no configurado → `503 AUTH_NOT_CONFIGURED`.

### 4.2 — Eliminar flujos duplicados

Archivos eliminados del repo:
- `apps/api/src/shared/auth.js`
- `apps/api/src/shared/auth/session.js`
- Carpeta `apps/api/src/shared/auth/` (queda vacía)

### 4.3 — Documentar el contrato para el equipo

Nuevo archivo: `docs/contratos/auth.md` con:
- Cómo usar el middleware en rutas.
- Qué contiene `request.user`.
- Reglas y prohibiciones.
- Ejemplos de uso correcto e incorrecto.

---

## 5. Impacto en otros módulos (fuera de mi alcance)

Los siguientes archivos dejan de funcionar al eliminar `shared/auth.js` y `shared/auth/session.js`. **Sus dueños deben migrarlos.**

### Adrián (P3) — `readings`

| Archivo | Cambio requerido |
|---|---|
| `readings/reading.routes.js` | Cambiar `import { requireRoles } from '../../shared/auth.js'` por `import { requireRole } from '../../shared/authorization/policies.js'` |
| `readings/reading.routes.js` | Cambiar `preHandler: [auth, ...]` por `preHandler: [authenticate, ...]` |
| `readings/index.js` | Reemplazar `buildAuth({ userRepository })` por `authenticate(db)` |
| `readings/reading.repository.js` | Cambiar `import { getDb } from '../../db/mongo.js'` por `import { getDb } from '../../shared/db.js'` (el archivo `db/mongo.js` no existe) |

### Aaron (P4) — `analytics`, `groups`, `assignments`, `attempts`, `studentAssignments`

| Archivo | Cambio requerido |
|---|---|
| `analytics/analytics.routes.js` | Cambiar `import { requireSession } from '../../shared/auth/session.js'` por `import { authenticate } from '../../shared/middleware/authenticate.js'` y registrar como preHandler global |
| `analytics/analytics.routes.js` | Quitar prefijo duplicado: registrar como `/groups/:groupId` en lugar de `/analytics/groups/:groupId` |
| `analytics/analytics.service.js` | Cambiar `user.userId` por `user._id` |
| `assignments/assignments.routes.js` | Cambiar `requireSession` por `authenticate` |
| `attempts/attempts.routes.js` | Cambiar `requireSession` por `authenticate` |
| `groups/groups.routes.js` | Cambiar `requireSession` por `authenticate` |
| `studentAssignments/studentAssignments.routes.js` | Cambiar `requireSession` por `authenticate` |

### P1 / P7 — `server.js`

El `server.js` actual tiene la mayor parte de `registerModules` comentada. Cuando se reactive, debe registrar los módulos con `authenticate` y no con `buildAuth`.

---

## 6. Pruebas

### Pruebas unitarias

- `tests/auth.domain.test.js` → 16 tests, todos pasan.
- `tests/users.domain.test.js` → 17 tests, todos pasan.

### Pruebas e2e (pendientes de activar)

Requieren Supabase + Mongo configurados:
- `tests/auth.e2e.test.js` → 10 tests marcados como `todo`.

**Casos cubiertos por los e2e:**
1. `GET /me` sin token → 401.
2. `GET /me` con Supabase no configurado → 503.
3. `GET /me` con token válido y usuario existente → 200.
4. `GET /me` con token válido y usuario nuevo → 200 (crea en Mongo).
5. `GET /me` con dominio no autorizado → 403.
6. `PATCH /me` con `role: admin` → 400 FORBIDDEN_FIELDS.
7. `PATCH /me` con `fullName` → 200.
8. `POST /internal/validate-domain` sin secreto → 401.
9. `POST /internal/validate-domain` con dominio válido → 200.
10. `POST /internal/validate-domain` con dominio inválido → 403.

---

## 7. Reglas para el equipo

### Permitido

- Usar `authenticate(db)` como preHandler en cualquier ruta protegida.
- Acceder al usuario autenticado con `request.user`.
- Usar `request.user._id` para ownership interno (Mongo).
- Usar `request.user.authUserId` para joins con Supabase.
- Usar `request.user.institutionId` para filtrar por institución.
- Usar `request.user.role` para autorización.

### Prohibido

- ❌ Usar `request.auth`.
- ❌ Usar `request.userId`.
- ❌ Usar `request.user.userId`.
- ❌ Importar de `shared/auth.js` o `shared/auth/session.js` (eliminados).
- ❌ Confiar en `user_metadata.role` del JWT (el rol vive en Mongo).
- ❌ Crear flujos paralelos de autenticación.

---

## 8. Bugs colaterales detectados (fuera de mi alcance)

Los siguientes bugs fueron detectados durante la revisión, pero **no son responsabilidad de P2**:

| # | Bug | Dueño | Prioridad |
|---|---|---|---|
| 1 | `reading.repository.js` importa `db/mongo.js` (no existe) | P3 (Adrián) | 🔴 Alta |
| 2 | `readings/index.js` usa funciones sin importar | P3 (Adrián) | 🔴 Alta |
| 3 | `analytics.routes.js` registra rutas con prefijo duplicado | P4 (Aaron) | 🟡 Media |
| 4 | `analytics.service.js` usa `user.userId` (campo inexistente) | P4 (Aaron) | 🟡 Media |
| 5 | `server.js` tiene `registerModules` comentado | P1 / P7 | 🔴 Alta |

---

## 9. Estado del PR

- **Rama:** `ft/2023307-auth-unificado`
- **Base:** `develop`
- **Archivos modificados:** 3
  - `apps/api/src/shared/middleware/authenticate.js` (reescrito)
  - `apps/api/src/shared/auth.js` (eliminado)
  - `apps/api/src/shared/auth/session.js` (eliminado)
- **Archivos añadidos:** 2
  - `docs/contratos/auth.md`
  - `docs/NOTAS_P2_FASE1.md` (este archivo)
- **Tests:** 33 unitarios pasan; 10 e2e pendientes de activar.

---

## 10. Pendiente para completar Fase 1

| # | Tarea | Bloqueado por |
|---|---|---|
| 1 | Activar los 10 tests e2e | Supabase + Mongo provisionados |
| 2 | Configurar el hook `before-user-created` en Supabase | P7 |
| 3 | Probar registro real end-to-end | P7 |
| 4 | Añadir `auditLogs` para login/registro/domain_rejected | — |
| 5 | Rate limit específico en `/auth/*` y `/me` | P7 |
| 6 | Revisión de logs de menores (minimización de datos) | P1 |

---

## 11. Contacto

- **Dueño del módulo:** Diego (P2)
- **Revisores:** P1, P7
- **Cambios a este contrato:** requieren ADR nuevo + aviso al equipo


---

## Endpoints de recuperación de contraseña

### `POST /api/v1/auth/forgot-password`

**Body:**
```json
{ "email": "usuario@colegiodemo.edu.gt" }