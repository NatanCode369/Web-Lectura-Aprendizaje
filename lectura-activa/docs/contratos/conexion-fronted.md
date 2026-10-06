# Pendientes del backend para terminar el frontend

**Autor:** Omar (Persona 5)
**Fecha:** 2026-10-05
**Propósito:** Lista de todo lo que falta en el backend para terminar la conexión con el frontend del estudiante y del docente.

---

## 🔴 CRÍTICOS (bloquean el frontend completo)

### 1. Prefijo duplicado en rutas

**Archivos afectados:**

- `apps/api/src/modules/groups/groups.routes.js`
- `apps/api/src/modules/assignments/assignments.routes.js`
- `apps/api/src/modules/analytics/analytics.routes.js`

**Problema:**

En `server.js` se registran con prefijo:

```js
await fastify.register(groupsRoutes, { prefix: "/api/v1/groups", db });
```

Y dentro de cada archivo las rutas **vuelven a incluir el recurso**:

```js
// groups.routes.js
fastify.get('/groups', ...)  // ❌ URL final: /api/v1/groups/groups
```

**URL real:** `/api/v1/groups/groups`
**URL esperada:** `/api/v1/groups`

**Solución:** cambiar las rutas internas a `/`.

**Afecta a:**

| Archivo                 | Ruta actual                       | Ruta correcta              |
| ----------------------- | --------------------------------- | -------------------------- |
| `groups.routes.js`      | `/groups`                         | `/`                        |
| `groups.routes.js`      | `/groups/:id`                     | `/:id`                     |
| `groups.routes.js`      | `/groups/:id/students`            | `/:id/students`            |
| `groups.routes.js`      | `/groups/:id/students/:studentId` | `/:id/students/:studentId` |
| `assignments.routes.js` | `/assignments`                    | `/`                        |
| `assignments.routes.js` | `/assignments/:id`                | `/:id`                     |
| `assignments.routes.js` | `/assignments/:id/start`          | `/:id/start`               |
| `assignments.routes.js` | `/assignments/:id/attempts`       | `/:id/attempts`            |
| `assignments.routes.js` | `/assignments/:id/close`          | `/:id/close`               |
| `analytics.routes.js`   | `/analytics/groups/:groupId`      | `/groups/:groupId`         |
| `analytics.routes.js`   | `/analytics/readings/:readingId`  | `/readings/:readingId`     |
| `analytics.routes.js`   | `/analytics/jobs/daily`           | `/jobs/daily`              |

**Responsable:** Aaron / líder.

---

### 2. Bug en `studentAssignments.service.js`

**Ubicación:** método `listMine()`, dentro del `.map()` que construye `enriched`.

**Problema:**

```js
const enriched = items.map((sa) => {
  const a = byId.get(sa.assignmentId.toString());  // ❌ byId no existe
  ...
});
```

**Solución:**

```js
const a = assignmentsById.get(sa.assignmentId.toString()); // ✅
```

**Sin esto, el endpoint falla** y `my-tasks.js` y `my-progress.js` no pueden listar las tareas del estudiante.

**Responsable:** Aaron.

---

### 3. Auth completo (Supabase)

**Estado:** no implementado. El frontend sigue mockeado.

**Endpoints pendientes:**

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`

**Configuración pendiente:**

- Configurar Supabase Auth.
- Pasar credenciales al frontend (URL + anon key).
- Definir cómo viaja el JWT (cookie HttpOnly o header `Authorization`).

**Responsable:** Diego.

---

### 4. Prefijo de `usersRoutes`

**Estado:** el `usersRoutes` está registrado con `prefix: '/api/v1/users'`.

**Problema:** el frontend espera `GET /api/v1/me`, pero el endpoint real es `GET /api/v1/users/me`.

**Solución:** decidir cuál prefijo usar.

**Recomendación:** mantener `/api/v1/me` para consistencia con el resto del API.

**Responsable:** Diego / líder.

---

## 🟡 MEDIOS (afectan pantallas específicas)

### 5. PDF en lecturas

**Estado:** no implementado. El docente no puede subir PDFs y el estudiante no los ve.

**Qué necesita el frontend:**

El `reading-activity.js` lee la URL del PDF desde cualquiera de estos campos:

- `reading.media.pdfUrl` ← **preferido**
- `reading.pdfUrl`
- `reading.contentUrl`
- `reading.content.pdfUrl`

Si ninguno existe, muestra "El PDF no está disponible".

**Qué debe hacer el backend:**

**Paso 1: Crear bucket privado en Supabase Storage**

- Nombre sugerido: `readings`
- Configuración: **privado** (no público)

**Paso 2: Endpoint para subir PDF (para el docente)**

- Ruta: `POST /api/v1/readings/:id/media`
- Middleware: autenticación + rol `teacher` o `admin`
- Recibe: `multipart/form-data` con el archivo PDF
- Valida:
  - MIME type `application/pdf`
  - Tamaño máximo: 20 MB
  - El docente es autor de la lectura (o admin)
- Hace:
  - Sube el archivo a Supabase Storage en `readings/{readingId}/{filename}.pdf`
  - Agrega al array `media` del documento de la lectura:
    ```json
    {
      "type": "pdf",
      "path": "readings/{readingId}/{filename}.pdf",
      "alt": "..."
    }
    ```

**Paso 3: Modificar `GET /readings/:id`**

- Buscar en `reading.media` un elemento con `type: 'pdf'`.
- Si existe, generar URL firmada temporal (1 hora):
  ```js
  const { data, error } = await supabaseAdmin.storage
    .from("readings")
    .createSignedUrl(pdfMedia.path, 60 * 60);
  ```
- Transformar el response:
  ```js
  return {
    ...reading,
    media: { pdfUrl: data?.signedUrl ?? null },
  };
  ```

**Estructura en MongoDB del documento de lectura:**

```json
{
  "_id": "reading_001",
  "title": "El principito",
  "media": [
    {
      "type": "pdf",
      "path": "readings/reading_001/el-principito.pdf",
      "alt": "PDF de El principito"
    }
  ]
}
```

**⚠️ Importante:**

- Se guarda el **path**, NO la URL pública (el bucket es privado).
- La URL firmada debe caducar (recomendado: 1 hora).
- El bucket debe llamarse `readings`.
- `supabaseAdmin` ya está configurado en `apps/api/src/config/supabase.js`.

**Archivos a modificar:**

- `apps/api/src/modules/readings/reading.routes.js` → agregar ruta `POST /:id/media`.
- `apps/api/src/modules/readings/reading.service.js` → agregar `uploadPdf()` y `generateSignedPdfUrl()`, modificar `getById()`.
- `apps/api/src/modules/readings/reading.repository.js` → agregar `addMedia()`.
- `apps/api/src/server.js` → registrar `@fastify/multipart`.
- `apps/api/package.json` → agregar `@fastify/multipart`.

**Responsable:** Adrián.

---

### 6. Confirmar filtrado de `correctAnswer`

**Estado:** el comentario en `assignments.domain.js` dice:

> "correctAnswer se incluye aquí para el backend; se filtra en attemptsService.start() para el frontend."

**Falta confirmar** que `attempts.service.js` realmente lo excluye antes de enviarlo al frontend.

**Sin esto, el estudiante puede ver las respuestas correctas** inspeccionando DevTools (Network).

**Responsable:** Aaron.

---

### 7. `summary` en `GET /analytics/readings/:readingId`

**Estado:** el endpoint `/analytics/groups/:groupId` devuelve `summary`, pero `/analytics/readings/:readingId` **no**.

**Solución:** agregar `summary` también al endpoint de readings, con la misma estructura:

```json
{
  "summary": {
    "assignedCount": 30,
    "completedCount": 25,
    "completionRate": 0.83,
    "averageScore": 82.5,
    "averageTimeSeconds": 720
  }
}
```

**Responsable:** Aaron.

---

## 🟢 BAJOS (mejoras opcionales)

### 8. Carga de PDF desde el docente

**Estado:** el formulario del docente tiene opción "PDF" pero muestra "no disponible".

**Solución:** implementar el endpoint de subida a Supabase Storage (ver punto 5).

**Responsable:** Adrián + Persona 7.

---

### 9. Detalle por actividad en `feedback.js`

**Estado:** `feedback.js` solo puede mostrar puntaje, tiempo y fecha. No puede mostrar el detalle por actividad (qué acertó, qué falló, respuestas correctas).

**Qué falta:** que `GET /student-assignments/me/assignments/:id` incluya:

- El `prompt` de cada actividad.
- Las respuestas del estudiante.
- Las respuestas correctas (post-envío).
- El feedback pedagógico (si existe).

**Responsable:** Aaron.

---

### 10. Código de grupo y alta de estudiantes por correo

**Estado:** el docente no puede:

- Compartir un código para que el estudiante se una al grupo.
- Agregar estudiantes por correo.
- Ver nombres/correos de los estudiantes del grupo.

**Solución:**

- Endpoint `POST /groups/:id/join` (por código).
- Endpoint `POST /groups/:id/students/by-email` (por correo).
- Enriquecer `GET /groups/:id` con datos de los estudiantes.

**Responsable:** Aaron.

---

## 🔷 Líder / DevOps

### 11. Backend corriendo

- [ ] Backend corriendo (local, LAN o Cloud Run).
- [ ] URL accesible para el frontend.
- [ ] Confirmar puerto (3000 o 8080).

### 12. Datos de prueba

- [ ] Usuario estudiante con tareas asignadas.
- [ ] Usuario docente con grupos y lecturas.
- [ ] Lecturas con PDF subido.
- [ ] Asignaciones activas.

### 13. CORS en producción

- [ ] Configurar `CORS_ORIGINS` en `env.js` con el dominio del frontend en producción.

---

## 📋 Resumen por responsable

### 🔷 Adrián

- [ ] **5.** Implementar PDF en lecturas (bucket + subida + URL firmada).

### 🔷 Aaron

- [ ] **1.** Arreglar prefijo duplicado en `groups`, `assignments`, `analytics`.
- [ ] **2.** Arreglar bug en `studentAssignments.service.js` (`byId` → `assignmentsById`).
- [ ] **6.** Confirmar filtrado de `correctAnswer`.
- [ ] **7.** Agregar `summary` a `/analytics/readings/:readingId`.
- [ ] **9.** Detalle por actividad en `feedback`.
- [ ] **10.** Código de grupo + alta por correo.

### 🔷 Diego

- [ ] **3.** Auth completo con Supabase.
- [ ] **4.** Prefijo de `usersRoutes` (o mantener `/api/v1/me`).

### 🔷 Líder / DevOps

- [ ] **11.** Backend corriendo y accesible.
- [ ] **12.** Datos de prueba.
- [ ] **13.** CORS en producción.

---

## 📌 Estado actual del frontend

**El frontend está listo y adaptado a los contratos actuales.** No requiere cambios pendientes una vez que el backend resuelva los puntos anteriores.

**Verificaciones rápidas:**

- ✅ Contratos de `studentAssignments` enriquecidos ya integrados (`readingTitle`, `groupName`, `timeLimitMinutes`).
- ✅ `activitySnapshot` con `items` y `pairs` integrado.
- ✅ Formato `{ user: {...} }` de `/users/me` ya manejado con fallback.
- ⏳ Puntos del 1 al 4 bloquean la prueba integral.
- ⏳ Puntos del 5 al 10 mejoran funcionalidad específica.

---
