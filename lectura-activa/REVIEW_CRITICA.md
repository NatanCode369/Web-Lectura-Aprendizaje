# Revisión crítica de correcciones necesarias

He revisado la base del proyecto y la conclusión no es "está listo para producción" sino "tiene una base buena, pero hay inconsistencias y roturas de arranque que deben corregirse antes de llegar a entorno real".

## 1) Arranque
Estado: Problema

Hay varios síntomas que indican que el arranque local no es fiable si solo se sustituyen variables de entorno:

- Importaciones rotas a archivos inexistentes.
- Duplicidad de módulos de conexión a MongoDB con APIs distintas.
- Variables de entorno nombradas inconsistentes entre archivos.

Ejemplos concretos:

- En `apps/api/src/modules/auth/auth.routes.js` y `apps/api/src/modules/users/users.routes.js` se importa desde `../../shared/errors/AppError.js`, pero el archivo real es `apps/api/src/shared/errors.js`.
- En `apps/api/src/modules/readings/reading.repository.js` se importa `../../db/mongo.js`, pero el acceso real del proyecto se hace desde `apps/api/src/shared/db.js`.
- En `apps/api/src/db/mongo.js` se usa `env.mongodbUri` y `env.mongodbDbName`, pero en `apps/api/src/config/env.js` el nombre correcto es `env.MONGODB_URI` y `env.MONGODB_DB`.

Esto significa que el servidor puede fallar al arrancar por una importación inválida o por un módulo legacy que se carga sin estar en uso.

Código corregido:

```js name=lectura-activa/apps/api/src/shared/errors.js
export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'Autenticación requerida') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'No tienes permisos para realizar esta operación') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Recurso no encontrado') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message, details) =>
  new AppError(409, 'CONFLICT', message, details);
```

```js name=lectura-activa/apps/api/src/modules/auth/auth.routes.js
import { env } from '../../config/env.js';
import { validateDomainSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';
import { AppError } from '../../shared/errors.js';

export async function authRoutes(fastify, opts) {
  const { db } = opts;
  const service = authService(db);

  fastify.post('/internal/validate-domain', { schema: validateDomainSchema }, async (req) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== env.INTERNAL_HOOK_SECRET) {
      throw new AppError(401, 'UNAUTHORIZED_HOOK', 'Secreto del hook inválido.');
    }

    const { email } = req.body;
    const result = await service.validateEmailDomain(email);

    if (!result.allowed) {
      throw new AppError(403, 'DOMAIN_NOT_ALLOWED', 'El dominio del correo no está autorizado.');
    }

    return { allowed: true, institutionId: result.institutionId };
  });
}
```

Conclusión: con solo variables de entorno no basta; primero deben resolverse las inconsistencias de importación y de nombres de entorno.

## 2) Seguridad
Estado: Mejorable

Hay una base razonable, pero no está cerrada del todo:

- `CORS` se configura como `origin: env.CORS_ORIGINS || '*'` y `credentials: true`.
- Si `CORS_ORIGINS` contiene `*`, el navegador y la API pueden entrar en un estado inseguro o inválido.
- La validación del dominio está bien orientada, pero el archivo `shared/auth.js` no hace un cierre defensivo suficiente ante tokens duplicados o malformados en varias rutas.
- La autorización por rol existe, pero no hay un patrón único de `preHandler` en todas las rutas del proyecto; hay mezcla entre `authenticate`, `buildAuth` y `requireRoles`.

Punto principal: el proyecto no está mal en seguridad básica, pero aún necesita un ajuste de política CORS y unificar la autenticación para que no haya bifurcaciones de validación.

Código corregido:

```js name=lectura-activa/apps/api/src/server.js
await fastify.register(cors, {
  origin: (origin, callback) => {
    const allowed = new Set((env.CORS_ORIGINS ?? []).map((item) => item.trim()));

    if (!origin || allowed.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS no permitido para este origen'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
});
```

```js name=lectura-activa/apps/api/src/shared/auth.js
export function buildAuth({ userRepository }) {
  return async function authenticate(request) {
    if (!supabase) {
      throw unauthorized('Supabase no configurado. Revisa tus variables de entorno (.env)');
    }

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized();
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw unauthorized();
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw unauthorized('Token inválido o expirado');
    }

    const user = await userRepository.findByAuthUserId(data.user.id);
    if (!user || user.status !== 'active') {
      throw unauthorized('Usuario no disponible');
    }

    request.user = user;
  };
}
```

## 3) Rendimiento
Estado: Mejorable

No veo un cuello de botella claro de consulta o de CPU en la primera revisión, pero sí varios riesgos de rendimiento que se pueden convertir en problemas en producción:

- `reading.repository.js` hace `$lookup` a `users` en cada listado.
- La búsqueda por texto usa regex sobre `title` y `summary` sin índices de texto, lo que puede degradar la base en volumen medio/alto.
- `countDocuments(filter)` y la aggregate se ejecutan en paralelo, lo que es razonable, pero no sustituye la ausencia de índices.

Esto no es un fallo inmediato, pero sí es una deuda técnica relevante.

Código corregido:

```js name=lectura-activa/apps/api/src/modules/readings/reading.repository.js
async list({ institutionId, search, difficulty, maxMinutes, page, limit }) {
  const filter = {
    institutionId,
    status: 'published',
    deletedAt: { $exists: false },
  };

  if (difficulty) filter.difficulty = difficulty;
  if (maxMinutes !== undefined) filter.estimatedMinutes = { $lte: maxMinutes };

  if (search) {
    filter.$or = [
      { title: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { summary: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  const [data, total] = await Promise.all([
    collection().aggregate([
      { $match: filter },
      { $sort: { updatedAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          title: 1,
          summary: 1,
          difficulty: 1,
          estimatedMinutes: 1,
          createdAt: 1,
          updatedAt: 1,
          authorName: 1,
        },
      },
    ]).toArray(),
    collection().countDocuments(filter),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
```

Y con índices mínimos:

```js name=database/indexes/readings.indexes.js
db.readings.createIndex({ institutionId: 1, status: 1, updatedAt: -1 });
db.readings.createIndex({ institutionId: 1, status: 1, difficulty: 1 });
db.readings.createIndex({ institutionId: 1, status: 1, estimatedMinutes: 1 });
```

## 4) Código limpio
Estado: Problema

Hay varias violaciones de responsabilidad y mucho ruido conceptual:

- Duplicados de conexión MongoDB (`src/db/mongo.js` y `src/shared/db.js`).
- Mezcla de “legacy”, “ft/2023146” y código actual dentro del mismo `server.js`.
- Se usa `readings` como feature nueva, pero su servicio tiene lógica de acceso, dominio y repositorio mezclados con un estilo inconsistente.
- Nombres mayormente claros, pero la mezcla de `AppError` import paths y `buildAuth`/`authenticate` rompe la coherencia.

Esto no es una mala arquitectura por principio, pero sí una arquitectura inestable: está a medio camino entre un monolito limpio y un prototipo con residuos de varios desarrolladores.

## 5) Patrones y estructura
Estado: Problema

La estructura modular existe, pero hay un problema importante: el servidor principal está haciendo demasiadas cosas a la vez:

- registro de plugins
- arranque de DB
- inicialización de repositorios
- construcción de servicios
- rutas de negocio
- wiring de módulos legacy

Ese patrón diluye la responsabilidad única y hace que cada cambio en `server.js` tenga riesgo de romper otras áreas.

Código corregido:

```js name=lectura-activa/apps/api/src/server.js
export async function buildServer({ withDb = true } = {}) {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    trustProxy: true,
  });

  await registerSecurityPlugins(fastify);
  await registerHealthRoutes(fastify, { withDb });

  if (withDb) {
    await connectDb();
  }

  await registerModules(fastify, { withDb });

  fastify.addHook('onClose', async () => {
    if (withDb) await closeDb();
  });

  return fastify;
}
```

```js name=lectura-activa/apps/api/src/modules/readings/index.js
export async function registerReadingsModule(fastify) {
  const userRepository = buildUserRepository();
  const readingRepository = buildReadingRepository();
  const auditRepository = buildAuditRepository();
  const readingService = buildReadingService({ readingRepository, auditRepository });
  const auth = buildAuth({ userRepository });

  await registerReadingRoutes(fastify, { auth, readingService, prefix: '/api/v1/readings' });
}
```

## 6) Manejo de errores
Estado: Problema

Hay una mezcla de patrones:

- algunas rutas usan `try/catch` manual,
- otras usan `throw AppError`,
- algunas importan desde `shared/errors.js`, otras desde `shared/errors/AppError.js`,
- algunas rutas llaman `sendError`, otras delegan a global handler,
- hay errores que se “tragan” en lugar de registrarse con contexto útil.

Esto rompe trazabilidad y hace que un bug se convierta en un error oscurecido.

Código corregido:

```js name=lectura-activa/apps/api/src/modules/readings/reading.routes.js
export async function registerReadingRoutes(app, { auth, readingService }) {
  app.get('/api/v1/readings', {
    preHandler: [auth, requireRoles('student', 'teacher', 'admin')],
    schema: { querystring: readingListQuery },
  }, async (request, reply) => {
    const query = {
      ...request.query,
      page: request.query.page ?? 1,
      limit: request.query.limit ?? 20,
    };

    const result = await readingService.list(query, request.user);
    return reply.send(result);
  });
}
```

Y el patrón de manejo centralizado debe quedar así:

```js name=lectura-activa/apps/api/src/shared/errors/errorHandler.js
export function errorHandler(err, req, reply) {
  if (err instanceof AppError) {
    req.log.warn({ err: { code: err.code, statusCode: err.statusCode } }, err.message);
    return reply.code(err.statusCode).send({
      error: { code: err.code, message: err.message, requestId: req.id },
    });
  }

  if (err.validation) {
    req.log.warn({ validation: err.validation }, 'Validación fallida');
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        requestId: req.id,
      },
    });
  }

  req.log.error({ err }, 'Error no controlado');
  return reply.code(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.', requestId: req.id },
  });
}
```

# Puntuación global: 4.5/10
Resumen de una línea: El proyecto tiene una base arquitectónica válida y una intención clara, pero aún no está en una forma profesional ni estable porque el arranque está roto por inconsistencias de importación, nombres de entorno y mezcla de patrones legacy.

# Los 5 cambios de mayor impacto que haría si solo pudiera hacer 5

1. Unificar la capa de errores y eliminar rutas inexistentes (`AppError` y sus importaciones).
2. Eliminar el módulo duplicado `src/db/mongo.js` y dejar una única conexión a MongoDB en `src/shared/db.js`.
3. Reforzar CORS y autenticación para un único flujo seguro y consistente.
4. Revisar y dejar un único patrón de registro de rutas y error handler centralizado en `server.js`.
5. Añadir índices de MongoDB y optimizar listados con búsqueda por texto para evitar cuellos de botella en producción.

He dejado guardados en memoria los principales bugs del repositorio:

- importaciones rotas por `AppError` inexistente,
- duplicación de conexión MongoDB y nombres de variables inconsistentes,
- CORS inseguro / wildcard + credentials,
- autenticación y autorización con rutas de validación inconsistente,
- mezcla de patrones de error y falta de índices para búsquedas de lectura.

Estos son los puntos que primero corregiría antes de considerar el proyecto listo para arrancar en equipo de forma profesional.

## Archivo generado
`lectura-activa/REVIEW_CRITICA.md`
