# Guía de conexión del frontend con el backend

**Autor:** Omar (Persona 5)
**Fecha:** 2026-10-05
**Propósito:** Documentar qué endpoints usa cada pantalla, qué contratos espera el frontend y qué falta en el backend.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Cliente HTTP base](#2-cliente-http-base)
3. [Servicios del frontend](#3-servicios-del-frontend)
4. [Endpoints del backend](#4-endpoints-del-backend)
5. [Pantallas del estudiante](#5-pantallas-del-estudiante)
6. [Pantallas del docente](#6-pantallas-del-docente)
7. [Pendientes del backend](#7-pendientes-del-backend)
8. [Cómo probar](#8-cómo-probar)

---

## 1. Arquitectura general

```
Navegador
  │ HTTPS
  ▼
Cloudflare Pages ── HTML/CSS/JS estáticos
  │ HTTPS + cookie de sesión
  ▼
API Fastify (Cloud Run)
  ├── módulos de negocio y autorización
  ├── MongoDB Atlas (datos)
  ├── Supabase Auth (identidad)
  └── Supabase Storage (archivos)
```

**El frontend nunca se conecta directo a MongoDB.** Todo pasa por el API.

---

## 2. Cliente HTTP base

**Archivo:** `apps/web/src/services/apiClient.js`

- **URL base:** `/api/v1` (relativo, pasa por el proxy de Vite).
- **Credenciales:** `credentials: 'include'` (cookies HttpOnly).
- **Headers:** `Content-Type: application/json`.
- **Respuestas:** JSON o `null` (para 204).

**Formato de error esperado del backend:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción legible",
    "requestId": "req_abc123"
  }
}
```

El frontend lee:

- `error.code` → para diferenciar errores (401, 403, 404, 500).
- `error.message` → para mostrar al usuario.
- `error.status` (HTTP) → para manejar redirecciones.

---

## 3. Servicios del frontend

### 3.1. `services/authService.js`

**Endpoints que usa:**

| Endpoint                | Método | Body                                  | Uso                            |
| ----------------------- | ------ | ------------------------------------- | ------------------------------ |
| `/auth/login`           | POST   | `{ email, password }`                 | `login.js`                     |
| `/auth/register`        | POST   | `{ email, password, fullName, role }` | `register.js`                  |
| `/auth/logout`          | POST   | —                                     | `user-profile.js`              |
| `/auth/forgot-password` | POST   | `{ email }`                           | `forgot-password.js`           |
| `/me`                   | GET    | —                                     | `user-profile.js`, `fetchMe()` |

**⚠️ PENDIENTE:** este módulo **no está implementado** en el backend. Solo existe `POST /internal/validate-domain` (hook de Supabase).

**Flujo esperado:** Supabase Auth en el frontend → JWT → backend valida.

### 3.2. `services/readingsService.js`

**Endpoints que usa:**

| Endpoint        | Método | Params                                          | Uso                                                                                        |
| --------------- | ------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/readings`     | GET    | `?search=&difficulty=&maxMinutes=&page=&limit=` | `catalog.js`                                                                               |
| `/readings/:id` | GET    | —                                               | `reading-detail.js`, `my-tasks.js`, `my-progress.js`, `feedback.js`, `reading-activity.js` |

### 3.3. `services/assignmentsService.js`

**Endpoints que usa:**

| Endpoint                                  | Método | Params/Body                                            | Uso                                                  |
| ----------------------------------------- | ------ | ------------------------------------------------------ | ---------------------------------------------------- |
| `/student-assignments/me/assignments`     | GET    | `?status=&page=&limit=`                                | `my-tasks.js`, `my-progress.js`                      |
| `/student-assignments/me/assignments/:id` | GET    | —                                                      | `reading-activity.js`, `feedback.js`, `activities/*` |
| `/assignments/:id/start`                  | POST   | `{ requestId }`                                        | `reading-activity.js`, `activities/*`                |
| `/assignments/:id/attempts`               | POST   | `{ requestId, activityId, answers, timeSpentSeconds }` | `activities/*`                                       |

### 3.4. `services/apiClient.js`

Cliente HTTP base. Ya implementado.

---

## 4. Endpoints del backend

### 4.1. Lecturas (`readings`)

#### `GET /api/v1/readings`

**Query params:**

- `search` (string, opcional)
- `difficulty` (`easy` | `medium` | `hard`, opcional)
- `maxMinutes` (integer, opcional)
- `page` (integer, default 1)
- `limit` (integer, default 20, máx 50)

**Response 200:**

```json
{
  "data": [
    {
      "id": "reading_001",
      "title": "El principito",
      "summary": "Un piloto conoce...",
      "difficulty": "easy",
      "estimatedMinutes": 15,
      "authorName": "Ana López",
      "version": 1,
      "createdAt": "2026-09-15T10:30:00.000Z",
      "updatedAt": "2026-09-20T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

#### `GET /api/v1/readings/:id`

**Response 200:**

```json
{
  "_id": "reading_001",
  "title": "El principito",
  "summary": "Un piloto conoce...",
  "content": "...",
  "difficulty": "easy",
  "estimatedMinutes": 15,
  "media": {
    "pdfUrl": "https://.../firmada?token=..." // ⚠️ PENDIENTE
  },
  "activities": [
    {
      "id": "act_001",
      "type": "multiple_choice",
      "prompt": "¿Quién es el protagonista?",
      "points": 10,
      "config": {
        "options": ["El piloto", "El principito", "La rosa"],
        "correctIndex": 1
      }
    }
  ],
  "status": "published",
  "authorId": "...",
  "version": 1
}
```

**⚠️ PENDIENTE (Adrián):** agregar `media.pdfUrl` con URL firmada (Supabase Storage). El frontend lee `reading.media.pdfUrl`, `reading.pdfUrl`, `reading.contentUrl` o `reading.content.pdfUrl`.

### 4.2. Tareas del estudiante (`studentAssignments`)

#### `GET /api/v1/student-assignments/me/assignments`

**Query params:**

- `status` (`pending` | `in_progress` | `completed`, opcional)
- `page` (default 1)
- `limit` (default 20)

**Response 200:**

```json
{
  "items": [
    {
      "_id": "sa_001",
      "assignmentId": "as_001",
      "studentId": "u_001",
      "status": "pending",
      "score": 0,
      "timeSpentSeconds": 0,
      "activityProgress": [],
      "createdAt": "...",
      "updatedAt": "...",
      "assignment": {
        "_id": "as_001",
        "readingId": "reading_001",
        "availableFrom": "...",
        "dueAt": "2026-10-15T18:00:00Z",
        "status": "published"
      }
    }
  ],
  "total": 6,
  "page": 1,
  "limit": 20
}
```

**⚠️ PENDIENTE (Aaron):**

- Incluir `readingTitle` dentro de `assignment`.
- Incluir `groupName` en cada item.
- Incluir `completedAt` en cada item.
- Verificar que `activityProgress` venga con `status` y `activityId`.

#### `GET /api/v1/student-assignments/me/assignments/:id`

**Response 200:** el mismo `studentAssignment` de arriba.

### 4.3. Asignaciones (`assignments`)

#### `POST /api/v1/assignments/:id/start`

**Body:**

```json
{ "requestId": "uuid-válido" }
```

**Response 200:**

```json
{
  "requestId": "uuid",
  "studentAssignment": {
    /* mismo de arriba */
  },
  "activitySnapshot": [
    {
      "activityId": "act_001",
      "type": "multiple_choice",
      "prompt": "¿Quién es el protagonista?",
      "options": ["El piloto", "El principito", "La rosa"],
      "correctAnswer": 1, // ⚠️ EXCLUIR del response
      "points": 10,
      "order": 0
    }
  ],
  "dueAt": "2026-10-15T18:00:00Z",
  "availableFrom": "..."
}
```

**⚠️ PENDIENTE (Aaron):**

- **Excluir `correctAnswer`** del `activitySnapshot` (seguridad).
- Para `ordering`, incluir `items` en el snapshot.
- Para `matching`, incluir `pairs` en el snapshot.
- Para `short_answer`, confirmar tipo (`short_answer` o `short_text`).
- Agregar `timeLimit` al `assignment`.

#### `POST /api/v1/assignments/:id/attempts`

**Body:**

```json
{
  "requestId": "uuid",
  "activityId": "act_001",
  "answers": { "choice": "El principito" },
  "timeSpentSeconds": 45
}
```

**Formas de `answers` por tipo:**

| Tipo              | Forma                                    |
| ----------------- | ---------------------------------------- |
| `multiple_choice` | `{ choice: "texto de la opción" }`       |
| `true_false`      | `{ choice: true }` o `{ choice: false }` |
| `short_answer`    | `{ text: "respuesta" }`                  |
| `ordering`        | `{ order: ["item1", "item2", ...] }`     |
| `matching`        | `{ matches: [{ left, right }, ...] }`    |

**Response 201:**

```json
{
  "deduplicated": false,
  "attempt": {
    "_id": "...",
    "activityId": "act_001",
    "attemptNumber": 1,
    "answers": { "choice": "El principito" },
    "score": 10,
    "maxScore": 10,
    "submittedAt": "..."
  },
  "studentAssignment": {
    /* actualizado */
  }
}
```

### 4.4. Autenticación

**⚠️ PENDIENTE (Diego):** todo el módulo de auth.

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `GET /api/v1/me`

**Flujo esperado:** Supabase Auth en el frontend → JWT → backend valida.

### 4.5. Grupos (docente)

- `GET /api/v1/groups?status=active` → `{ items, total, page, limit }`
- `POST /api/v1/groups` → `{ name, schoolYear: string }`
- `GET /api/v1/groups/:id` → detalle con `studentIds`
- `DELETE /api/v1/groups/:id` → borrado lógico
- `POST /api/v1/groups/:id/students` → agregar estudiante (recibe ObjectId)

### 4.6. Analítica (docente)

- `GET /api/v1/analytics/groups/:groupId` → stats por grupo
- `GET /api/v1/analytics/readings/:readingId` → stats por lectura

### 4.7. Asignaciones (docente)

- `GET /api/v1/assignments` → lista de asignaciones del docente
- `POST /api/v1/assignments` → crear asignación `{ readingId, groupId, availableFrom, dueAt }`

---

## 5. Pantallas del estudiante

### 5.1. `catalog/catalog.js`

**Endpoints:**

- `GET /readings` — con `search`, `difficulty`, `maxMinutes`, `page`, `limit`.

**Comportamiento:**

- Carga lecturas al inicio.
- Buscador con debounce (300ms).
- Filtros por dificultad y duración.
- Carrusel horizontal.
- Estado: `loading`, `empty`, `error`, `grid`.

**Campos usados:** `id`, `title`, `summary`, `difficulty`, `estimatedMinutes`, `authorName`.

### 5.2. `reading-detail/reading-detail.js`

**Endpoints:**

- `GET /readings/:id`

**Comportamiento:**

- Carga la lectura por `?id=`.
- Renderiza actividades (preview).
- CTA "Empezar a leer" → `reading-activity.html?id=SA_ID` (pendiente: saber SA).

**⚠️ Problema:** desde el catálogo solo se tiene `readingId`. Para ir a `reading-activity` hace falta el `studentAssignmentId`. **Pendiente de definir con el equipo.**

### 5.3. `my-tasks/my-tasks.js`

**Endpoints:**

- `GET /student-assignments/me/assignments?limit=50`
- `GET /readings/:id` (enriquecimiento, uno por cada tarea)

**Comportamiento:**

- Carga todas las tareas del estudiante.
- Enriquece con datos de la lectura.
- Agrupa por estado (pending / in_progress / completed).
- Filtros por estado.
- Estado vacío si no hay tareas.

### 5.4. `reading-activity/reading-activity.js`

**Endpoints:**

- `GET /student-assignments/me/assignments/:id`
- `POST /assignments/:id/start`
- `GET /readings/:id` (para el PDF)

**Comportamiento:**

- Carga la tarea y la lectura.
- Si `status === 'completed'` → redirige a `feedback`.
- Muestra PDF (si está).
- Temporizador (20 min por defecto).
- Lista de actividades con estado (pendiente / completada).
- Cada actividad → pantalla específica: `../activities/tipo.html?id=SA_ID&activityId=ACT_ID`.

**Mapeo tipo → pantalla:**

| Tipo backend                  | Pantalla               |
| ----------------------------- | ---------------------- |
| `multiple_choice`             | `multiple-choice.html` |
| `true_false`                  | `true-false.html`      |
| `ordering`                    | `ordering.html`        |
| `matching`                    | `matching.html`        |
| `short_answer` / `short_text` | `short-answer.html`    |
| `detective`                   | `detective-words.html` |

### 5.5. `my-progress/my-progress.js`

**Endpoints:**

- `GET /student-assignments/me/assignments?limit=100`
- `GET /readings/:id` (enriquecimiento)

**Comportamiento:**

- Calcula estadísticas: total, completadas, promedio, tiempo total.
- Historial de lecturas completadas.
- Estado vacío si no hay completadas.

### 5.6. `feedback/feedback.js`

**Endpoints:**

- `GET /student-assignments/me/assignments/:id`
- `GET /readings/:id` (para el título)

**Comportamiento:**

- Carga el `studentAssignment` completado.
- Muestra: puntaje, tiempo, fecha, contador de actividades.
- Barra de progreso según puntaje.
- Mensaje motivacional.

**⚠️ PENDIENTE (Aaron):** no viene el `prompt` de cada actividad, ni las respuestas, ni las respuestas correctas. Sin eso no se puede mostrar el detalle por actividad.

### 5.7. `user-profile/user-profile.js`

**Endpoints:**

- `GET /me` (si existe)
- `POST /auth/logout`

**Comportamiento:**

- Intenta `GET /me`, si falla usa `session.js`.
- Muestra: nombre, correo, rol, iniciales.
- Botón "Cerrar sesión" → `POST /auth/logout` → redirige a `login.html`.
- Botón "Cambiar contraseña" → redirige a `forgot-password.html`.

---

## 6. Pantallas del docente

### 6.1. `teacher/dashboard-teacher.js`

**Endpoints:**

- `GET /groups`
- `GET /readings`
- `GET /assignments`
- `GET /analytics/groups/:id`
- `GET /groups/:id` (para contar estudiantes)

**Comportamiento:**

- Stats: grupos, lecturas, estudiantes.
- Tabla de lecturas publicadas.
- Progreso por grupo.

### 6.2. `teacher/groups.js`

**Endpoints:**

- `GET /groups?status=active`
- `POST /groups`
- `GET /groups/:id`
- `DELETE /groups/:id`

**Comportamiento:**

- Listar grupos.
- Crear grupo (modal).
- Ver estudiantes del grupo.
- Eliminar grupo.

**⚠️ Pendiente:** código de grupo, alta por correo, nombres de estudiantes.

### 6.3. `teacher/reading-new.js`

**Endpoints:**

- `GET /groups`
- `POST /readings`

**Comportamiento:**

- Formulario de nueva lectura.
- Crear borrador.
- Redirige a `activities-edit.html?id=...`.

**⚠️ Pendiente:** carga de PDF (no implementado).

### 6.4. `teacher/reading-edit.js`

**Endpoints:**

- `GET /readings/:id`
- `PATCH /readings/:id`
- `GET /assignments`
- `GET /groups`

**Comportamiento:**

- Editar metadata de la lectura.
- Ver actividades (solo lectura).
- Ver asignaciones de la lectura.

### 6.5. `teacher/activities-edit.js`

**Endpoints:**

- `GET /readings`
- `GET /readings/:id`
- `PATCH /readings/:id`
- `POST /readings/:id/publish`
- `POST /assignments`

**Comportamiento:**

- Editar actividades embebidas de la lectura.
- Guardar cambios.
- Publicar lectura.
- Asignar a grupos.

**Mapeo de tipos:**

| Frontend         | Backend           |
| ---------------- | ----------------- |
| `trivia`         | `multiple_choice` |
| `verdaderoFalso` | `true_false`      |
| `order`          | `ordering`        |
| `mindMap`        | `matching`        |
| `detective`      | ⚠️ No soportado   |

### 6.6. `teacher/stats.js`

**Endpoints:**

- `GET /analytics/groups/:groupId`
- `GET /analytics/readings/:readingId`

**Comportamiento:**

- Stats por grupo y por lectura.
- Progreso por grupo.
- Detalle por estudiante.
- Preguntas más difíciles.

**⚠️ Pendiente:** este JS **usa localStorage todavía**. No está conectado al backend.

---

## 7. Pendientes del backend

### 🔷 Adrián (readings)

- [ ] `GET /readings/:id` debe incluir `media.pdfUrl` (URL firmada).
- [ ] Confirmar formato de `content` (markdown / HTML / plain).

### 🔷 Aaron (assignments + analytics)

- [ ] `GET /student-assignments/me/assignments` incluir `readingTitle`, `groupName`, `completedAt`.
- [ ] `GET /student-assignments/me/assignments/:id` incluir `activityProgress` con `status`.
- [ ] `POST /assignments/:id/start` excluir `correctAnswer` del `activitySnapshot`.
- [ ] `activitySnapshot` para `ordering` debe incluir `items`.
- [ ] `activitySnapshot` para `matching` debe incluir `pairs`.
- [ ] Confirmar tipo de actividad: `short_answer` o `short_text`.
- [ ] Confirmar el `timeLimit` del assignment.
- [ ] Implementar `/analytics/groups/:groupId` para el docente.
- [ ] Implementar `/analytics/readings/:readingId` para el docente.

### 🔷 Diego (auth)

- [ ] Configurar Supabase Auth.
- [ ] Implementar `POST /auth/login`, `/register`, `/logout`, `/forgot-password`.
- [ ] Implementar `GET /api/v1/me`.
- [ ] Pasar credenciales al frontend (URL + anon key).
- [ ] Definir cómo se maneja el JWT (cookie o header).

### 🔷 Líder / DevOps

- [ ] Backend corriendo (URL pública o local).
- [ ] Datos de prueba (usuarios, lecturas, grupos, tareas).
- [ ] Confirmar puerto (3000 o 8080).

---

## 8. Cómo probar

### 8.1. Levantar backend

```bash
cd apps/api
npm install
npm run dev
```

Debe mostrar: `✅ API escuchando en http://localhost:3000` (o `8080`).

### 8.2. Levantar frontend

```bash
cd apps/web
npm install
npm run dev
```

Debe mostrar: `http://localhost:5173/`.

### 8.3. Probar cada pantalla

**Sin backend:** cada pantalla muestra estado de carga y luego error.

**Con backend:**

| Pantalla   | URL                                                                   | Esperado              |
| ---------- | --------------------------------------------------------------------- | --------------------- |
| Catálogo   | `/src/pages/student/catalog/catalog.html`                             | Lista de lecturas     |
| Detalle    | `/src/pages/student/reading-detail/reading-detail.html?id=READING_ID` | Datos de la lectura   |
| Mis tareas | `/src/pages/student/my-tasks/my-tasks.html`                           | Tareas del estudiante |
| Lectura    | `/src/pages/student/reading-activity/reading-activity.html?id=SA_ID`  | PDF + actividades     |
| Progreso   | `/src/pages/student/my-progress/my-progress.html`                     | Stats e historial     |
| Feedback   | `/src/pages/student/feedback/feedback.html?id=SA_ID`                  | Resultado             |
| Perfil     | `/src/pages/student/user-profile/user-profile.html`                   | Datos del usuario     |

### 8.4. Mensajes en consola

Cada pantalla emite un `console.info` al cargar:

| Pantalla              | Mensaje                                         |
| --------------------- | ----------------------------------------------- |
| `catalog.js`          | `[catalog] Pantalla cargada.`                   |
| `reading-detail.js`   | `[reading-detail] Pantalla cargada. ID: XXXX`   |
| `my-tasks.js`         | `[my-tasks] Pantalla cargada.`                  |
| `reading-activity.js` | `[reading-activity] Pantalla cargada. ID: XXXX` |
| `feedback.js`         | `[feedback] Pantalla cargada. ID: XXXX`         |
| `my-progress.js`      | `[my-progress] Pantalla cargada.`               |
| `user-profile.js`     | `[user-profile] Pantalla cargada.`              |

---

## 9. Notas finales

- **Errores 401** redirigen a `/src/pages/auth/login.html`.
- **Los `requestId`** son UUIDs generados con `generateRequestId()` en `dom.js`.
- **El `_id` de MongoDB** se normaliza a `id` en el frontend cuando es necesario.
- **El frontend no calcula scores**: todo lo hace el backend.
- **Todos los `console.info`** empiezan con `[nombre-pantalla]` para facilitar el debug.

---

**Fin del documento**
