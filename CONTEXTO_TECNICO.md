# Lectura Activa — Contexto técnico compartido

> **Propósito de este documento:** es la fuente de contexto para el equipo de desarrollo y sus agentes de IA. Cualquier agente debe leerlo antes de proponer cambios. Si una decisión nueva contradice este documento, debe plantearla en un ADR (`docs/adr/`) antes de implementarla.

## 1. Producto y alcance

**Lectura Activa** es una aplicación web para estudiantes de secundaria que incentiva la lectura y mejora la comprensión mediante textos breves y actividades lúdicas no convencionales. Los docentes crean contenido, lo asignan a grupos y consultan estadísticas de progreso.

### Usuarios y permisos

| Rol | Puede hacer |
| --- | --- |
| Estudiante | Registrarse con correo institucional autorizado, leer textos disponibles o asignados, completar actividades, consultar su propio progreso. |
| Docente | Crear, editar y publicar lecturas; crear grupos; asignar lecturas; consultar solamente las estadísticas de sus grupos. |
| Administrador | Gestionar dominios autorizados, usuarios, contenido global y configuraciones institucionales. |

### Restricciones y supuestos

- Primera versión: aproximadamente **250 usuarios**.
- Cliente construido con **HTML, CSS y JavaScript**; no se requiere React, Angular ni Vue.
- Todo dato persistente vive en la nube. Las lecturas textuales se guardan en MongoDB; archivos multimedia se guardan en almacenamiento de objetos privado.
- Se almacenan datos de estudiantes menores de edad: se debe recopilar el mínimo de datos personales posible y protegerlos por defecto.
- La arquitectura debe permitir escalar sin introducir microservicios prematuramente.

## 2. Decisión de arquitectura: MongoDB

Se sustituye PostgreSQL/Supabase Database por **MongoDB Atlas**. La decisión se ajusta al conocimiento actual del equipo y a un dominio con actividades de formatos variables. MongoDB es especialmente conveniente para almacenar configuraciones de actividades como documentos JSON; sin embargo, no elimina la necesidad de validar datos, diseñar índices ni controlar relaciones.

**Patrón adoptado: monolito modular, API REST y arquitectura por capas.** Un solo servicio de backend se despliega como contenedor y sus módulos tienen límites claros. Al crecer, un módulo con carga real (por ejemplo, analítica) podrá extraerse sin cambiar los contratos públicos.

### Stack acordado

| Área | Tecnología | Responsabilidad |
| --- | --- | --- |
| Cliente web | HTML, CSS, JavaScript ES Modules, Vite | Interfaz accesible, navegación, llamadas a API y estado local efímero. |
| API | Node.js LTS + Fastify | API REST, autenticación, autorización, reglas de negocio, validación y auditoría. |
| Datos | MongoDB Atlas + driver oficial de MongoDB para Node.js | Datos operativos, índices, copias de seguridad y monitoreo administrado. |
| Autenticación | Supabase Auth | Registro restringido por dominio, verificación de correo, recuperación de contraseña y sesiones seguras. |
| Archivos | Supabase Storage privado | Portadas, imágenes, audio y adjuntos mediante URLs firmadas temporales. |
| Despliegue | Cloudflare Pages (cliente) + Cloud Run (API Docker) + MongoDB Atlas | CDN para estáticos, API escalable y base de datos administrada. |
| Calidad | ESLint, Prettier, Vitest y pruebas de integración con MongoDB | Consistencia de código y verificación de flujos críticos. |
| Observabilidad | Logs JSON, health checks, métricas y alertas de Atlas | Detectar fallos, latencia, errores y consultas lentas. |

> MongoDB se modela según los patrones de acceso: se embeben datos pequeños que siempre se leen juntos y se usan referencias para relaciones muchos-a-muchos, datos que crecen sin límite o que se consultan por separado. Esta distinción está alineada con la guía oficial de [embedding](https://www.mongodb.com/docs/manual/data-modeling/embedding/) y [referencias](https://www.mongodb.com/docs/manual/data-modeling/referencing/).

## 3. Arquitectura de alto nivel

```text
Navegador
  │ HTTPS
  ▼
Cloudflare Pages ── entrega HTML/CSS/JS estáticos
  │ HTTPS + cookie de sesión
  ▼
API Fastify (Cloud Run)
  ├── módulos de negocio y autorización
  ├── MongoDB Atlas (datos de la aplicación)
  ├── Supabase Auth (identidad y sesiones)
  └── Supabase Storage privado (archivos con URL firmada)
```

El navegador nunca se conecta directamente a MongoDB, no recibe credenciales de Atlas ni almacenamiento, y no decide permisos por sí solo.

## 4. Capas del proyecto

Cada módulo del backend sigue estas capas. No se deben saltar capas ni hacer consultas a MongoDB desde controladores HTTP.

| Capa | Ubicación propuesta | Se encarga de | No debe encargarse de |
| --- | --- | --- | --- |
| Presentación web | `apps/web/src/` | Vistas, componentes, accesibilidad, formularios, llamadas al API y mensajes de error. | Reglas de autorización, claves secretas o consultas directas a base de datos. |
| Rutas/controladores | `apps/api/src/modules/*/*.routes.js` | Definir endpoints, leer petición, aplicar validación de entrada y devolver códigos HTTP. | Reglas complejas ni acceso directo a colecciones. |
| Aplicación/casos de uso | `apps/api/src/modules/*/*.service.js` | Orquestar operaciones como asignar una lectura, registrar un intento o generar estadísticas. | Detalles de HTTP y sintaxis de MongoDB. |
| Dominio | `apps/api/src/modules/*/*.domain.js` | Reglas puras: roles, estados válidos, cálculo de puntuación y transiciones de progreso. | I/O, variables de entorno o dependencias de infraestructura. |
| Infraestructura/repositorios | `apps/api/src/modules/*/*.repository.js` | Consultas MongoDB, índices, transacciones, adaptadores de correo y almacenamiento. | Decidir permisos de usuario a nivel HTTP. |
| Transversal | `apps/api/src/shared/` | Configuración, manejo de errores, logger, autenticación, autorización, validadores y utilidades reutilizables. | Lógica específica de una lectura, grupo o actividad. |

### Flujo interno esperado

```text
Ruta HTTP → middleware de sesión/rol → controlador → caso de uso → repositorio/adaptador → MongoDB o servicio externo
```

## 5. Estructura de directorios

```text
lectura-activa/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   └── src/
│   │       ├── assets/          # imágenes locales y recursos estáticos
│   │       ├── components/      # componentes reutilizables de UI
│   │       ├── pages/           # auth/, student/, teacher/, admin/
│   │       ├── services/        # cliente HTTP y adaptadores de UI
│   │       ├── state/           # estado efímero de sesión/interfaz
│   │       ├── styles/          # tokens, base, componentes y páginas
│   │       ├── utils/
│   │       └── main.js
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── groups/
│       │   │   ├── readings/
│       │   │   ├── assignments/
│       │   │   ├── activities/
│       │   │   └── analytics/
│       │   ├── shared/
│       │   └── server.js
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
├── database/
│   ├── indexes/                 # definición versionada de índices
│   ├── migrations/              # scripts idempotentes de evolución de datos
│   └── seeds/                   # datos ficticios; nunca datos reales
├── docs/
│   ├── adr/                     # decisiones arquitectónicas numeradas
│   └── CONTEXTO_TECNICO.md
├── .env.example                 # nombres de variables, sin valores reales
├── docker-compose.yml           # entorno local, incluido MongoDB local
└── README.md
```

## 6. Modelo de datos MongoDB

Todos los documentos usan `_id: ObjectId`, `createdAt`, `updatedAt` y, cuando aplica, `deletedAt` para borrado lógico. Las fechas se guardan en UTC. Los campos de correo se normalizan a minúsculas.

### Colecciones operativas

| Colección | Documento y propósito | Relaciones e índices iniciales |
| --- | --- | --- |
| `users` | `authUserId`, `email`, `fullName`, `role`, `institutionId`, `status`, `profile` | Índice único `{ authUserId: 1 }` y `{ email: 1 }`; índice `{ institutionId: 1, role: 1 }`. La identidad y las sesiones pertenecen a Supabase Auth. |
| `institutions` | `name`, `allowedEmailDomains`, `settings` | Los dominios autorizados se consultan durante el registro. |
| `groups` | `institutionId`, `name`, `schoolYear`, `teacherId`, `studentIds`, `status` | Índices `{ teacherId: 1, status: 1 }` y `{ studentIds: 1, status: 1 }`. Para grupos masivos, mover membresías a `groupMembers`. |
| `readings` | `institutionId`, `title`, `summary`, `content`, `difficulty`, `estimatedMinutes`, `media`, `activities`, `status`, `authorId`, `version` | Índices `{ institutionId: 1, status: 1, difficulty: 1 }` y `{ authorId: 1, updatedAt: -1 }`. Las actividades pequeñas se embeben aquí. |
| `assignments` | `readingId`, `readingVersion`, `groupId`, `teacherId`, `availableFrom`, `dueAt`, `activitySnapshot`, `status` | Índices `{ groupId: 1, status: 1, dueAt: 1 }` y `{ teacherId: 1, createdAt: -1 }`. El snapshot garantiza que una tarea ya asignada no cambie si se edita la lectura. |
| `studentAssignments` | `assignmentId`, `studentId`, `status`, `startedAt`, `completedAt`, `score`, `timeSpentSeconds`, `activityProgress` | Índice único `{ assignmentId: 1, studentId: 1 }`; índice `{ studentId: 1, status: 1, updatedAt: -1 }`. Incluye progreso compacto, no historial ilimitado. |
| `activityAttempts` | `studentAssignmentId`, `activityId`, `attemptNumber`, `answers`, `score`, `feedback`, `submittedAt` | Índice `{ studentAssignmentId: 1, activityId: 1, submittedAt: -1 }`; historial separado porque puede crecer. |
| `analyticsDaily` | `date`, `groupId`, `assignmentId`, `completedCount`, `assignedCount`, `averageScore`, `averageTimeSeconds` | Índice único `{ date: 1, groupId: 1, assignmentId: 1 }`; alimenta paneles sin recalcular todo. |
| `auditLogs` | `actorId`, `action`, `resourceType`, `resourceId`, `metadata`, `createdAt` | Índice `{ resourceType: 1, resourceId: 1, createdAt: -1 }`; no incluir contraseñas ni respuestas sensibles. |

### Regla de embebido y referencias

- **Embebido:** configuración de actividades dentro de `readings`, `profile` dentro de `users` y progreso resumido dentro de `studentAssignments`.
- **Referencia:** usuario–grupo, lectura–asignación, asignación–estudiante e intentos. Son relaciones consultadas de manera independiente, muchos-a-muchos o potencialmente sin límite.
- **Límite:** ningún documento puede superar 16 MiB. No se deben insertar audios, imágenes ni historiales sin límite dentro de un documento.
- **Consistencia:** al registrar un intento que complete una asignación, usar una operación idempotente y, si se modifican varios documentos, una transacción de Atlas. Actualizar `analyticsDaily` de forma asíncrona o mediante operación segura de incremento.

## 7. Contratos API iniciales

Prefijo: `/api/v1`. Respuestas JSON. Los errores usan `{ "error": { "code", "message", "requestId" } }`; nunca devuelven trazas internas.

| Área | Endpoints iniciales |
| --- | --- |
| Autenticación | Operaciones gestionadas por Supabase Auth; la API valida el JWT y expone `GET /me` para el perfil y permisos de la aplicación. |
| Perfil | `GET /me`, `PATCH /me` |
| Grupos | `GET/POST /groups`, `GET/PATCH/DELETE /groups/:id`, `POST /groups/:id/students` |
| Lecturas | `GET /readings`, `GET /readings/:id`, `POST /readings`, `PATCH /readings/:id`, `POST /readings/:id/publish` |
| Asignaciones | `GET/POST /assignments`, `GET /assignments/:id`, `POST /assignments/:id/start`, `POST /assignments/:id/attempts` |
| Analítica | `GET /analytics/groups/:groupId`, `GET /analytics/readings/:readingId` |
| Operación | `GET /health`, `GET /ready` |

Todo endpoint que modifica datos valida esquema de entrada, autentica sesión y autoriza por rol y propiedad del recurso. Los endpoints de docente deben verificar que el grupo, lectura o asignación pertenece al docente autenticado.

## 8. Seguridad y privacidad

1. El registro compara el dominio del correo con `institutions.allowedEmailDomains` **antes** de crear una cuenta mediante un hook de Supabase Auth y exige verificar el correo.
2. Supabase Auth gestiona contraseñas, recuperación y sesiones. La API valida sus JWT; no almacena contraseñas ni tokens de sesión en MongoDB.
3. Aplicar HTTPS, CORS de lista permitida, protección CSRF para solicitudes mutables por cookie, rate limiting en autenticación y cabeceras de seguridad.
4. Guardar solamente nombre, correo institucional, rol y datos educativos imprescindibles. No registrar contenido de contraseñas, tokens ni información sensible en logs.
5. Archivos privados: el API verifica autorización y genera URLs firmadas con vida corta. Nunca publicar el bucket ni sus claves.
6. Producción usa secretos en el gestor del proveedor; `.env` no se versiona. Solo `.env.example` vive en Git.
7. Configurar backups, alertas de disponibilidad y pruebas de restauración en Atlas. Atlas ofrece monitoreo y mecanismos de respaldo administrados; la configuración y la política de recuperación siguen siendo responsabilidad del equipo. [Guía de respaldos](https://www.mongodb.com/docs/atlas/architecture/current/backups/)

## 9. Flujo funcional principal

```text
Estudiante:
Inicio → registro/inicio de sesión → validar dominio y correo → ver tareas/catálogo
→ elegir lectura → leer → completar actividades → enviar intento
→ calcular resultado → guardar progreso → mostrar retroalimentación.

Docente:
Inicio de sesión → crear o editar lectura → configurar actividades
→ publicar/asignar a grupos → estudiantes trabajan → consultar avances y estadísticas.
```

## 10. Reglas de implementación para humanos y agentes de IA

- Leer este archivo y los ADR relevantes antes de modificar código.
- No introducir frameworks de frontend ni microservicios sin una decisión explícita del equipo.
- Usar JavaScript, módulos ES y nombres en inglés para código; interfaz y mensajes de usuario en español neutro.
- Validar entradas en la frontera HTTP y volver a validar invariantes en el caso de uso. MongoDB flexible **no** significa esquema sin control.
- Crear o actualizar índices junto con cualquier consulta nueva frecuente. No añadir índices por intuición: justificar el patrón de consulta.
- No usar `find()` sin filtro, paginación y proyección en colecciones que puedan crecer (`activityAttempts`, `auditLogs`, analítica).
- Las acciones de escritura deben ser idempotentes cuando puedan reintentarse; utilizar `requestId` o claves únicas cuando corresponda.
- Implementar pruebas de autorización para cada endpoint: estudiante ajeno, docente ajeno y administrador.
- Mantener secretos y datos reales fuera del repositorio. Usar datos ficticios en semillas y pruebas.
- Documentar cambios arquitectónicos significativos en `docs/adr/NNNN-titulo.md`: contexto, decisión, consecuencias y alternativas descartadas.

## 11. Ruta de crecimiento

La primera fase no necesita particionamiento, colas distribuidas ni servicios separados. Se activarán solo bajo evidencia:

| Señal | Acción futura |
| --- | --- |
| Paneles docentes lentos | Llevar agregaciones a un trabajo programado/cola y ampliar `analyticsDaily`. |
| Muchas notificaciones o correos | Añadir una cola de trabajos para tareas diferidas. |
| Muchas instituciones o carga sostenida | Escalar Cloud Run y evaluar índices, réplicas de lectura o particionamiento en Atlas según métricas. |
| Búsqueda de catálogo más rica | Evaluar MongoDB Search, manteniendo `readings` como fuente de verdad. |

Antes de escalar, revisar consultas lentas, índices y métricas reales de Atlas; los índices deben responder a consultas frecuentes y su exceso penaliza escrituras. [Guía oficial de índices](https://www.mongodb.com/docs/manual/data-modeling/schema-design-process/create-indexes/)
