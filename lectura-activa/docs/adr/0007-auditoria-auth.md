# ADR 0007 — Auditoría de eventos de auth

- **Estado:** Aceptado
- **Fecha:** 08 de Octubre, 2026
- **Responsable:** Diego (P2 — Backend de identidad y usuarios)
- **Revisores:** P1 (Líder técnico), P7 (Plataforma y seguridad)

---

## 1. Contexto

La revisión externa del equipo (`REVISION_ERRORES_Y_DESPLIEGUE.md`, sección 5.6) pidió **registrar en auditoría los eventos críticos de auth**:

> "Falta registrar en auditoría login, registro y dominios rechazados; faltan límites específicos para `/auth/*` y `/me`."

Esta auditoría es un **requisito de seguridad** para una plataforma con menores de edad. Permite:
- **Detectar** patrones sospechosos (ej: 100 logins fallidos en 5 min).
- **Investigar** incidentes ("¿por qué no puede entrar este usuario?").
- **Cumplir** con políticas de protección de datos.
- **Responder** a preguntas de los admins sobre actividad de usuarios.

---

## 2. Decisión

Se crea la colección `auditLogs` y el servicio `auditService` que registra **10 eventos críticos** de auth.

### 2.1 Estructura del documento

```js
{
  _id: ObjectId,
  actorId: ObjectId | null,      // Usuario que hizo la acción (null si falló login o no identificado)
  action: String,                // 'login.success', 'login.failure', etc.
  resourceType: String,          // 'user', 'passwordReset', etc.
  resourceId: ObjectId | null,   // ID del recurso afectado (si aplica)
  metadata: Object,              // Info contextual (ip, role, reason, email enmascarado)
  createdAt: Date,
}
```

### 2.2 Índices

| Índice | Uso |
|---|---|
| `{ actorId: 1, createdAt: -1 }` | Historia de un usuario específico |
| `{ action: 1, createdAt: -1 }` | Eventos por tipo (ej: todos los `login.failure`) |
| `{ resourceType: 1, resourceId: 1, createdAt: -1 }` | Historia de un recurso |
| `{ createdAt: 1 }, expireAfterSeconds: 90 días` | **TTL** — auto-borrado a los 90 días |

**TTL:** MongoDB borra automáticamente los logs después de 90 días. Sin coste de mantenimiento.

### 2.3 Eventos registrados (10)

| # | Evento | Cuándo se dispara | `actorId` | `metadata` |
|---|---|---|---|---|
| 1 | `login.success` | Login exitoso | Usuario en Mongo | `{ role }` |
| 2 | `login.failure` | Credenciales incorrectas | `null` | `{ email, reason: 'invalid_credentials' }` |
| 3 | `register.success` | Usuario registrado | `null` | `{ email, role: 'student' }` |
| 4 | `register.failure` | Registro rechazado | `null` | `{ email, reason }` |
| 5 | `reset.requested` | Alguien pidió reset | `null` | `{ email }` |
| 6 | `reset.completed` | Contraseña cambiada | `null` | `{ email }` |
| 7 | `role.assigned` | Rol asignado al crear user | Usuario nuevo | `{ role, reason: 'lazy_provisioning' }` |
| 8 | `role.changed` | Rol actualizado por whitelist | Usuario existente | `{ from, to }` |
| 9 | `domain.rejected` | Hook rechazó un dominio | `null` | `{ email }` |
| 10 | `logout` | Sesión cerrada | Usuario (si está autenticado) | `{}` |

**`register.failure`** registra distintos `reason`:
- `domain_not_allowed` — el correo no pertenece a un dominio autorizado.
- `email_exists` — el correo ya está registrado.
- `weak_password` — la contraseña no cumple los requisitos.
- `validation_error` — otros 422 de Supabase.
- `unknown_error` — error desconocido.

### 2.4 Reglas de seguridad

1. **NUNCA rompe el flujo principal.** Si falla `audit.log()`, se loguea el error y sigue.
   - Esto significa: si Mongo cae, los logins siguen funcionando. Solo se pierden los logs.
2. **NO guarda datos sensibles.**
   - Emails enmascarados con `maskEmail()` → `dmartinez-2023307@kinal.edu.gt` → `dm***@ki***.edu.gt`.
   - Nunca se guardan contraseñas, tokens ni JWT.
3. **TTL de 90 días.** Se borran automáticamente.
4. **No hay endpoint público** para consultar los logs (Fase 2 añadirá endpoints admin).

---

## 3. Ejemplos reales

### 3.1 `login.success`

```js
{
  actorId: ObjectId('6ac6f0d087d48414b7b9a14f'),
  action: 'login.success',
  resourceType: 'user',
  resourceId: ObjectId('6ac6f0d087d48414b7b9a14f'),
  metadata: { role: 'teacher' },
  createdAt: ISODate('2026-10-08T04:24:08Z')
}
```

### 3.2 `login.failure`

```js
{
  actorId: null,
  action: 'login.failure',
  resourceType: 'user',
  resourceId: null,
  metadata: { email: 'ma***@ki***.edu.gt', reason: 'invalid_credentials' },
  createdAt: ISODate('2026-10-08T04:24:17Z')
}
```

### 3.3 `register.failure`

```js
{
  actorId: null,
  action: 'register.failure',
  resourceType: 'user',
  resourceId: null,
  metadata: { email: 'al***@gm***.com', reason: 'domain_not_allowed' },
  createdAt: ISODate('2026-10-08T04:25:00Z')
}
```

### 3.4 `role.changed`

```js
{
  actorId: ObjectId('6ac6f0d087d48414b7b9a14f'),
  action: 'role.changed',
  resourceType: 'user',
  resourceId: ObjectId('6ac6f0d087d48414b7b9a14f'),
  metadata: { from: 'student', to: 'teacher' },
  createdAt: ISODate('2026-10-08T04:30:00Z')
}
```

### 3.5 `domain.rejected`

```js
{
  actorId: null,
  action: 'domain.rejected',
  resourceType: 'user',
  resourceId: null,
  metadata: { email: 'al***@gm***.com' },
  createdAt: ISODate('2026-10-08T04:25:30Z')
}
```

---

## 4. Cómo consultar los logs

### 4.1 Ver los últimos 10 eventos

```bash
cd ~/Desktop/Proyecto\ Idioma/Web-Lectura-Aprendizaje/lectura-activa/apps/api

node --input-type=module -e "
import 'dotenv/config';
import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db = c.db(process.env.MONGODB_DB ?? 'lectura-activa');
const logs = await db.collection('auditLogs').find({}).sort({ createdAt: -1 }).limit(10).toArray();
logs.forEach(l => console.log(l.createdAt.toISOString(), '-', l.action, '-', JSON.stringify(l.metadata)));
await c.close();
"
```

### 4.2 Ver historia de un usuario

```js
db.auditLogs.find({ actorId: ObjectId('...') }).sort({ createdAt: -1 })
```

### 4.3 Ver todos los `login.failure`

```js
db.auditLogs.find({ action: 'login.failure' }).sort({ createdAt: -1 })
```

### 4.4 Contar eventos por tipo

```js
db.auditLogs.aggregate([
  { $group: { _id: '$action', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### 4.5 Ver intentos con dominios rechazados

```js
db.auditLogs.find({ action: 'domain.rejected' }).sort({ createdAt: -1 })
```

---

## 5. Responsabilidades del equipo

### P2 (Diego) — **DUEÑO**
- ✅ Implementó la colección, el servicio y los 10 eventos.
- ✅ Documentó el ADR.
- **Fase 2:** endpoints admin para consultar los logs.

### P1 (Líder técnico)
- ✅ Revisó y aprobó la implementación.
- **No tiene que tocar nada más.**

### P7 (DevOps)
- ✅ Revisó los índices y TTL.
- **No tiene que tocar nada más** (a menos que quiera ajustar el TTL).
- **Pendiente:** si se migra a otra DB, asegurar que el TTL se reaplique.

### P3 (Adrián)
- **Pendiente:** auditar eventos de `readings` (Fase 2). Ej: `reading.created`, `reading.updated`, `reading.published`.
- **No es obligatorio ahora.** Solo si P1 lo pide.

### P4 (Aaron)
- **Pendiente:** auditar eventos de `groups`, `assignments`, `attempts` (Fase 2).
- **No es obligatorio ahora.**

### P5 (Omar)
- **No tiene que tocar nada.** Los logs son backend.
- **Opcional:** si el frontend quiere mostrar "última actividad" del usuario, puede consultar los logs vía endpoint admin (Fase 2).

### P6 (José)
- **No tiene que tocar nada.**

---

## 6. Cómo añadir un evento nuevo (para cualquier dev)

Si alguien quiere auditar un evento nuevo, **debe coordinarse con P2** (dueño del módulo).

**Paso 1 — Añadir la llamada en el servicio correspondiente:**

```js
await audit.log({
  actorId: <ObjectId del usuario que hizo la acción>,
  action: 'nombre.del.evento',        // ej: 'reading.created'
  resourceType: 'reading',            // ej: 'reading', 'group', 'assignment'
  resourceId: <ObjectId del recurso>, // ej: el _id de la lectura
  metadata: { /* info relevante */ },
});
```

**Paso 2 — Verificar que el servicio tenga acceso a `auditService`:**

```js
import { auditService } from '../../shared/audit.service.js';

export function readingService(db) {
  const audit = auditService(db);
  // ...
}
```

**Paso 3 — Actualizar el ADR 0007** con el nuevo evento en la tabla.

**Paso 4 — Probar:**

```bash
# Ejecutar la acción
# Verificar en auditLogs
db.auditLogs.find({ action: 'nombre.del.evento' }).sort({ createdAt: -1 }).limit(5)
```

---

## 7. Plan de Fase 2

**Cuando P1 lo pida:**

| # | Tarea | Responsable |
|---|---|---|
| 1 | Endpoint admin `GET /api/v1/audit/logs` con filtros | P2 |
| 2 | Endpoint admin `GET /api/v1/audit/logs/:id` | P2 |
| 3 | Dashboard admin para ver logs | P6 (José) |
| 4 | Auditoría en `readings` | P3 (Adrián) |
| 5 | Auditoría en `groups`, `assignments`, `attempts` | P4 (Aaron) |
| 6 | Auditoría en `users` (promover, suspender) | P2 |
| 7 | Alertas automáticas (ej: 100 `login.failure` en 5 min) | P7 |

---

## 8. Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| **Registrar TODO (GET, PATCH, etc.)** | Demasiado ruido, poco valor. Solo se auditan eventos críticos. |
| **Sin TTL** | Crecimiento sin control. 250 usuarios × 10 eventos × 365 días = ~1M docs/año. |
| **Sin enmascarar emails** | Riesgo de exponer datos de menores en logs. |
| **Guardar JWT / sesiones** | Riesgo de seguridad. Nunca se guardan tokens. |
| **Endpoint público sin auth** | Los logs son información sensible. Solo admin en Fase 2. |
| **Romper el flujo si falla la auditoría** | Un fallo de Mongo no debe bloquear logins. |

---

## 9. Verificación end-to-end

**Probado el 08-Oct-2026:**

| # | Evento | Verificado |
|---|---|---|
| 1 | `login.success` | ✅ |
| 2 | `login.failure` | ✅ |
| 3 | `register.success` | ✅ |
| 4 | `register.failure` (con `reason: email_exists`) | ✅ |
| 5 | `register.failure` (con `reason: domain_not_allowed`) | ✅ |
| 6 | `reset.requested` | ✅ |
| 7 | `reset.completed` | ✅ |
| 8 | `role.assigned` | ⏳ (código listo, no disparado en pruebas) |
| 9 | `role.changed` | ⏳ (código listo, no disparado en pruebas) |
| 10 | `domain.rejected` | ✅ |
| 11 | `logout` | ⏳ (código listo, no disparado en pruebas) |

**Emails enmascarados correctamente en todos los eventos.** ✅

---

## 10. Referencias

- `REVISION_ERRORES_Y_DESPLIEGUE.md` §5.6
- `docs/adr/0001-auth-supabase-mongodb.md`
- `docs/adr/0006-roles-por-whitelist.md`
- `docs/contratos/auth.md` (sección de auditoría)
- `apps/api/src/shared/audit.service.js`
- `apps/api/src/modules/auth/auth.service.js`

---

## 11. Contacto

- **Dueño del módulo:** Diego (P2)
- **Revisores:** P1, P7
- **Cambios a la auditoría:** requieren coordinación con P2 + actualización de este ADR.