# Resumen Bloques A + B — Fixes de producción y roles por whitelist

**Autor:** Diego (P2 — Backend de identidad y usuarios)
**Fecha:** 08 de Octubre, 2026
**PR:** [por asignar]
**Rama:** `ft/2023307`

---

## 0. Resumen ejecutivo

Se aplican **11 fixes críticos** para producción (Bloque A) + **1 feature de asignación de roles** (Bloque B). Ambos bloques provienen de las revisiones externas del equipo (`REVISION_ERRORES_Y_DESPLIEGUE.md`, `REVISION_2_ARCHIVOS_ENVIADOS.md`).

| Bloque | Commits | Archivos | Estado |
|---|---|---|---|
| **A — Fixes de producción** | 2 | 6 modificados | ✅ Aplicado y verificado |
| **B — Roles por whitelist** | 2 | 6 modificados + 4 nuevos | ✅ Aplicado y verificado |

**Verificación end-to-end:**
- ✅ Register + login con `marbinaquino@kinal.edu.gt` → `role: 'teacher'`.
- ✅ Register + login con `alumno@kinal.edu.gt` → `role: 'student'`.
- ✅ Migración crea `admins` y `teachers` con índice único.
- ✅ Seed limpia usuarios ficticios y crea whitelist.
- ✅ Servidor arranca con MongoDB + Supabase.

---

## 1. Bloque A — Fixes críticos para producción

### 1.1 Commits incluidos

```
72e75de fix(p2): auto-confirmar register, cookie 24h y errores separados
2f25719 fix(p2): endurecer mailer y config para producción
```

### 1.2 Cambios aplicados

#### A1 — Auto-confirmar register en producción
- **Archivo:** `auth.service.js`
- **Antes:** `email_confirm: env.NODE_ENV !== 'production'`.
- **Ahora:** `email_confirm: true` siempre.
- **Razón (P1):** confiar en el hook de dominio para validar pertenencia. Sin esto, nadie nuevo puede hacer login en producción.

#### A2 — Cookie de acceso a 24h
- **Archivo:** `auth.routes.js`
- **Antes:** `maxAge: 60 * 60` (1 hora).
- **Ahora:** `maxAge: 60 * 60 * 24` (24 horas).
- **Razón (P1):** evitar expulsiones silenciosas cada hora. No hay endpoint de refresh todavía.

#### A3 — Bloquear `MAILER_MODE=console` en producción
- **Archivo:** `env.js`
- **Nuevo check:** si `isProd` y `MAILER_MODE=console` → error de arranque.
- **Razón:** evitar que los tokens de reset se logueen en consola en producción.

#### A4 — Enmascarar emails en logs del mailer
- **Archivo:** `mailer.js`
- **Función:** `maskEmail(email)` → `"estudiante@kinal.edu.gt"` → `"es***@ki***.gt"`.
- **Razón:** protección de datos de menores (logger no debe exponer correos).

#### A5 — Validar `MAILER_FROM` en producción
- **Archivo:** `env.js`
- **Nuevo check:** si `isProd` y `MAILER_MODE=resend` y `MAILER_FROM.endsWith('.local')` → error.
- **Razón:** Resend rechaza dominios `.local`. Sin esto, los correos fallan silenciosamente.

#### A6 — Timeout de 10s en Resend
- **Archivo:** `mailer.js`
- **Implementación:** `AbortController` con `setTimeout(10000)`.
- **Razón:** evitar peticiones colgadas que agoten el tiempo del proxy de Vercel.

#### A7 — Eliminar `listUsers` innecesario en `forgotPassword`
- **Archivo:** `auth.service.js`
- **Antes:** consulta `listUsers` cuyo resultado no se usaba.
- **Ahora:** solo `generateLink` para verificar existencia.
- **Razón:** reducir tiempos de respuesta y evitar filtraciones por timing.

#### A8 — Separar "correo duplicado" de "contraseña débil" en register
- **Archivo:** `auth.service.js`
- **Antes:** cualquier 422 → "correo ya registrado".
- **Ahora:**
  - `already` / `duplicate` → `EMAIL_ALREADY_EXISTS`.
  - `password` / `weak` → `WEAK_PASSWORD` (422).
  - otros 422 → `VALIDATION_ERROR`.
- **Razón:** mensajes precisos al usuario.

#### A8.1 — Añadir `AppError.unprocessable` (422)
- **Archivo:** `AppError.js`
- **Nuevo método estático:** `AppError.unprocessable(code, message)`.
- **Razón:** necesario para `WEAK_PASSWORD`.

#### A9 — Corregir scripts `migrate` y `seed` en `package.json`
- **Archivo:** `package.json`
- **Antes:** `node ../../database/migrations/...` (fuera de `apps/api`).
- **Ahora:** `node scripts/migrate.mjs` y `node scripts/seed.mjs`.
- **Razón:** Render usa `apps/api` como raíz. Los paths viejos no existen.

#### A10 — Declarar `engines: ">=22"`
- **Archivo:** `package.json`
- **Antes:** `>=20`.
- **Ahora:** `>=22`.
- **Razón:** Vercel/Render usan Node 22. Los scripts usan `globSync` (Node 22+).

---

## 2. Bloque B — Roles por whitelist

### 2.1 Commits incluidos

```
d024976 docs(p2): ADR 0006 (roles por whitelist) y contrato actualizado
1b264cf feat(p2): roles por whitelist (admins, teachers) y dominio kinal.edu.gt
```

### 2.2 Decisión arquitectónica

**ADR 0006.** Dos colecciones nuevas en MongoDB:
- **`admins`** — correos con `role: 'admin'`.
- **`teachers`** — correos con `role: 'teacher'`.
- **Todo lo demás** → `role: 'student'`.

**Ventajas:**
- No requiere redeploy para añadir/quitar docentes.
- Escalable a futuras instituciones.
- El rol se actualiza en el próximo login del usuario (sin acción manual).

### 2.3 Estado inicial de la whitelist

| Correo | Rol |
|---|---|
| `aaguilar-2023146@kinal.edu.gt` | `admin` (P1) |
| `jmazul-2023430@kinal.edu.gt` | `admin` (Mazul) |
| `marbinaquino@kinal.edu.gt` | `teacher` (Marbin) |
| *cualquier otro* | `student` |

### 2.4 Cambios aplicados

#### B1 — `roles.domain.js` (nuevo)
- **Funciones puras:**
  - `resolveRoleFromWhitelist(email, { admins, teachers })` → `'admin' | 'teacher' | 'student'`.
  - `shouldUpdateRole(currentRole, newRole)` → booleano.

#### B2 — `roles.repository.js` (nuevo)
- **`whitelistRepo(db, collectionName)`** con:
  - `isInList(email)`.
  - `findAllEmails()`.
  - `add(email, addedBy)`.
  - `remove(email)`.
- **Exports:** `adminsRepo(db)`, `teachersRepo(db)`.

#### B3 — `auth.repository.js` (modificado)
- Re-exporta `adminsRepo` y `teachersRepo` para que `auth.service.js` los importe del mismo sitio.

#### B4 — `auth.service.js` (modificado)
- `ensureUserFromJwt`:
  1. Resuelve rol por whitelist (`admins` + `teachers`).
  2. Si el usuario existe y el rol difiere → actualiza.
  3. Si no existe → crea con el rol resuelto.

#### B5 — `scripts/migrate.mjs` (modificado)
- Crea colecciones `admins` y `teachers` con validador JSON Schema.
- Índice único en `email`.

#### B6 — `scripts/seed.mjs` (reescrito)
- **Limpieza:** borra usuarios `dev-*` y `@colegiodemo.edu.gt`.
- **Institución oficial:** Kinal (`kinal.edu.gt`).
- **Whitelist:** inserta 2 admins + 1 teacher.
- **NO crea usuarios ficticios.** Los usuarios se crean en el primer login.

#### B7 — Documentación
- `docs/adr/0006-roles-por-whitelist.md`.
- `docs/contratos/auth.md` (sección nueva).
- `docs/NOTAS_P2_ROLES.md`.

### 2.5 Verificación end-to-end

**Register + login de docente:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"marbinaquino@kinal.edu.gt","password":"test12345"}'
```
Resultado: `{"user":{"email":"marbinaquino@kinal.edu.gt","role":"teacher",...}}` ✅

**Register + login de estudiante:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alumno@kinal.edu.gt","password":"test12345"}'
```
Resultado: `{"user":{"email":"alumno@kinal.edu.gt","role":"student",...}}` ✅

---

## 3. Estado de la DB tras aplicar ambos bloques

```
Colecciones:
  - institutions    (1 doc: Kinal, dominio kinal.edu.gt)
  - users           (2 docs de prueba, ambos student)
  - admins          (2 docs: P1, Mazul)
  - teachers        (1 doc: Marbin)
  - passwordResets  (vacía o con tokens usados)
```

**Los 4 usuarios ficticios (`dev-*`) fueron eliminados.**

---

## 4. Qué tiene que hacer cada persona

### P1 (Líder técnico)
- ✅ Decidió auto-confirmar en prod, cookie 24h, lista de correos.
- **Pendiente:** confirmar que el nombre "Kinal" es el correcto para la institución (hoy dice "Kinal" en el seed).
- **Pendiente:** revisar el PR y mergear cuando P7 confirme las variables de Render.

### P2 (Diego — tú)
- ✅ Bloque A aplicado.
- ✅ Bloque B aplicado.
- **Pendiente:** subir el PR y esperar revisión.
- **Pendiente (Fase 2):** rate limit específico en `/auth/*`, auditoría en `auditLogs`.

### P3 (Adrián)
- **Pendiente:** migrar `readings` a `authenticate`.
- **Pendiente:** añadir `POST /readings/:id/publish` (snippet entregado).
- **Pendiente:** aportar las 35 lecturas para la semilla unificada.

### P4 (Aaron)
- **Pendiente:** migrar `analytics`, `groups`, `assignments`, `attempts`, `studentAssignments` a `authenticate`.
- **Pendiente:** arreglar prefijo duplicado en `analytics.routes.js`.
- **Pendiente:** sacar el job diario del scope de `requireSession`.

### P5 (Omar)
- **Pendiente:** quitar la validación de dominio fijo `@kinal.edu.gt` del frontend.
- **Pendiente:** acordar tabla única de códigos de error.
- **Pendiente:** reemplazar `endpoint-reset-password.md` por el contrato real.
- **Pendiente:** guardas de acceso en el frontend (`requireLogin`, manejo de 401).
- **Nuevo:** consumir `role` de `/me` para mostrar pantallas de docente/admin.

### P6 (José)
- **Pendiente:** escapar HTML en `activities-edit.js` (XSS + bug de comillas).

### P7 (Jefferson y Luis)
- **Pendiente crítico:** rotar credenciales expuestas (`S1`).
- **Pendiente:** configurar `MAILER_MODE=resend`, `RESEND_API_KEY`, `MAILER_FROM` en Render.
- **Pendiente:** confirmar `REQUIRE_EDGE=false`.
- **Pendiente:** rate limiting en `/auth/*` (coordinación con P2).
- **Pendiente:** rotar `COOKIE_SECRET`, `INTERNAL_HOOK_SECRET`, `ANALYTICS_JOB_SECRET` en producción.

---

## 5. Variables de entorno en producción (Render)

Todas estas **deben estar configuradas** en el panel de Render:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `MONGODB_URI` | `mongodb+srv://...` (Atlas) |
| `MONGODB_DB` | `lectura-activa` |
| `SUPABASE_URL` | `https://....supabase.co` |
| `SUPABASE_ANON_KEY` | (P7) |
| `SUPABASE_SERVICE_ROLE_KEY` | (P7) |
| `INTERNAL_HOOK_SECRET` | ≥ 32 chars (generar con `openssl rand -hex 32`) |
| `ANALYTICS_JOB_SECRET` | ≥ 32 chars |
| `COOKIE_SECRET` | ≥ 32 chars |
| `FRONTEND_URL` | `https://<dominio-vercel>` |
| `CORS_ORIGINS` | `https://<dominio-vercel>` |
| `MAILER_MODE` | `resend` |
| `RESEND_API_KEY` | `re_...` (P7) |
| `MAILER_FROM` | correo de dominio verificado en Resend |
| `RESET_TOKEN_TTL_MINUTES` | `15` (default) |
| `REQUIRE_EDGE` | `false` |

---

## 6. Cómo trabajar con la whitelist de roles

### Añadir un docente

```js
// Mongo Shell
db.teachers.insertOne({
  email: 'nuevo@kinal.edu.gt',
  addedBy: null,
  createdAt: new Date()
})
```

**El rol se actualiza en su próximo login.** No requiere reinicio del servidor.

### Añadir un admin

```js
db.admins.insertOne({
  email: 'nuevo-admin@kinal.edu.gt',
  addedBy: null,
  createdAt: new Date()
})
```

### Quitar a alguien

```js
db.teachers.deleteOne({ email: 'nuevo@kinal.edu.gt' })
db.admins.deleteOne({ email: 'nuevo-admin@kinal.edu.gt' })
```

**Ojo:** al quitarlo, **no pierde el rol inmediatamente**. Solo se actualizará a `student` en su próximo login.

### Ver la whitelist actual

```bash
node --input-type=module -e "
import 'dotenv/config';
import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db = c.db(process.env.MONGODB_DB ?? 'lectura-activa');
console.log('Admins:', (await db.collection('admins').find({}).toArray()).map(a => a.email));
console.log('Teachers:', (await db.collection('teachers').find({}).toArray()).map(t => t.email));
await c.close();
"
```

---

## 7. Testing rápido tras el deploy

### En desarrollo (localhost)

```bash
# Arrancar servidor
cd apps/api && node src/server.js

# En otra terminal:
# 1. Health
curl http://localhost:8080/health

# 2. Login de docente (debe dar role: teacher)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"marbinaquino@kinal.edu.gt","password":"test12345"}'

# 3. Ver el perfil
curl http://localhost:8080/api/v1/me -b cookies.txt
```

### En producción (Render)

Mismos `curl` pero contra la URL de Render.

**Si el login de docente devuelve `role: 'student'`**, verificar:
- El correo está exactamente en `db.teachers`.
- El usuario no existía previamente con otro rol en `db.users`.
- Si existía con otro rol, su próximo login debe actualizarlo.

---

## 8. Pendientes conocidos (Fase 2)

- **Rate limiting específico** en `/auth/forgot-password`, `/auth/reset-password`, `/auth/login`.
- **Auditoría** en `auditLogs` para login, registro, reset, cambios de rol.
- **Refresh de sesión** (`POST /auth/refresh`) si en el futuro se reduce la cookie.
- **Endpoint admin** para gestionar la whitelist desde UI (hoy es Mongo).
- **Migración de `shared/auth.js`** (pendiente de P1 y P3/P4).

---

## 9. Enlaces a los ADRs

- `docs/adr/0001-auth-supabase-mongodb.md`
- `docs/adr/0004-bearer-y-cookie.md`
- `docs/adr/0005-reset-password-con-token-propio.md`
- `docs/adr/0006-roles-por-whitelist.md` ← nuevo

---

## 10. Contacto

- **Dueño del módulo:** Diego (P2)
- **Revisores:** P1, P7
- **Cambios al flujo de roles:** requieren ADR nuevo + aviso al equipo