# QA: bugs en memoria y soluciones óptimas

## Alcance
Este documento consolida los defectos detectados durante la revisión del repositorio y la solución recomendada para cada uno, priorizando la opción más segura y mantenible para un proyecto con arquitectura monolítica modular basada en Fastify + MongoDB + Supabase.

## 1) Duplicación de conexión a MongoDB

### Bug
Existe más de una implementación de conexión a MongoDB:

- `apps/api/src/shared/db.js`
- `apps/api/src/db/mongo.js`

Ambas representan la misma responsabilidad y pueden divergir con el tiempo. La duplicación provoca:

- riesgo de usar una conexión distinta a la esperada,
- inconsistencias de entorno (`env.MONGODB_URI` vs `env.mongodbUri`),
- errores de arranque o runtime según qué módulo se importe primero,
- dificultad para probar y mantener.

### Impacto
Alto. Puede romper la inicialización del servicio, generar conexiones innecesarias y complicar la depuración.

### Solución óptima para el contexto
Mantener una única fuente de verdad: `apps/api/src/shared/db.js`.

Motivo:
- ya está integrada con `server.js` y con el resto de la app,
- la estructura Modular/Shared está alineada con la arquitectura definida en el proyecto,
- centraliza el patrón singleton y facilita manejo de `closeDb()`, `pingDb()` y logger.

### Recomendación técnica
- Eliminar `apps/api/src/db/mongo.js` o convertirlo en un wrapper legacy que re-exporte la instancia desde `shared/db.js`.
- Mantener solo una función `connectDb`, `getDb`, `closeDb`, `pingDb`.
- Unificar todos los imports a `../../shared/db.js`.

### Patrón recomendado
```js
// apps/api/src/shared/db.js
let client = null;
let db = null;

export async function connectDb() {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  db = client.db(env.MONGODB_DB);
  await db.command({ ping: 1 });
  return db;
}

export function getDb() {
  if (!db) throw new Error('MongoDB no está conectado. Llama a connectDb() antes de usar getDb().');
  return db;
}
```

---

## 2) Inconsistencia de nombres de variables de entorno

### Bug
El proyecto mezcla el estilo de entorno entre mayúsculas/minúsculas y nombres distintos:

- `MONGODB_URI`, `MONGODB_DB`
- `env.mongodbUri`, `env.mongodbDbName`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `env.SUPABASE_URL`, `env.SUPABASE_ANON_KEY`

Esto produce comportamiento inconsistente y rompe la lectura en condiciones de arranque o test.

### Impacto
Alto. La aplicación puede arrancar en algunos módulos y romper en otros, y puede provocar fallos ocultos según el camino de ejecución.

### Solución óptima
Establecer una convención única: `process.env` con nombres `SCREAMING_SNAKE_CASE` y acceso consistente en `config/env.js`:

```js
export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
};
```

Y luego usar siempre:

```js
import { env } from '../config/env.js';
client = new MongoClient(env.MONGODB_URI, {});
```

---

## 3) Importaciones rotas y rutas inexistentes

### Bug
Se detectan imports a archivos no existentes o a ubicaciones que no coinciden con la estructura real del repositorio, por ejemplo:

- `../../shared/errors/AppError.js`
- `../../shared/errors/AppError.js` desde módulos que deberían importar desde `../../shared/errors.js` o desde `../../shared/errors/AppError.js` solo si ese archivo existe.
- `../../db/mongo.js` en módulos que deberían usar `../../shared/db.js`.

### Impacto
Alto. La aplicación no arranca o falla al cargar módulos.

### Solución óptima
Definir una única capa de errores y un único punto de acceso a la base de datos:

- errores: `apps/api/src/shared/errors/AppError.js`
- DB: `apps/api/src/shared/db.js`

Regla de mantenimiento:
- cada módulo importa solo desde la capa correcta,
- no mezclar versiones legacy y actuales,
- no mantener dos APIs para la misma responsabilidad.

### Patrón recomendado
```js
// definido en una sola ubicación
import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
```

---

## 4) CORS inseguro con `credentials: true` y `origin: '*'`

### Bug
El servidor usa una configuración de CORS que permite cualquier origen cuando `env.CORS_ORIGINS` no está bien definido, y además habilita `credentials: true`.

Esto es una mezcla peligrosa porque `origin: '*'` con credenciales no es compatible de forma segura.

### Impacto
Medio/alto. Exposición de API a orígenes no controlados y posibilidad de abuso o acceso cruzado no autorizado.

### Solución óptima
Usar validación explícita de orígenes permitidos y permitir solo `localhost`/dominio real del frontend.

```js
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

### Recomendación adicional
- Evitar `*` cuando `credentials: true`.
- Mantener `CORS_ORIGINS` como separador por comas: `http://localhost:5173,https://app.example.com`.

---

## 5) Duplicidad de estrategias de autenticación y autorización

### Bug
El proyecto tiene más de un flujo de autenticación:

- `apps/api/src/shared/auth.js`
- `apps/api/src/shared/middleware/authenticate.js`
- `apps/api/src/config/supabase.js`

La lógica está repartida en varios puntos y se mezcla validación JWT de Supabase con provisioning de usuario en MongoDB. El riesgo es que diferentes rutas usen validaciones distintas.

### Impacto
Alto. El sistema puede autenticar de forma inconsistente en diferentes módulos y rutas.

### Solución óptima
Elegir un único flujo de autenticación para toda la API y un único middleware central con `req.auth`.

#### Opción recomendada
- Mantener la estrategia en `shared/middleware/authenticate.js` como patrón central.
- Dejar `buildAuth` como wrapper auxiliar solo si se necesita para módulos concretos.
- Asegurar que todas las rutas usen el mismo preHandler. 

### Patrón recomendado
```js
export function authenticate(db) {
  const service = authService(db);

  return async function authenticateHandler(req, reply) {
    if (!supabaseReady) {
      return reply.code(503).send({
        error: { code: 'AUTH_NOT_CONFIGURED', message: 'El servicio de autenticación no está configurado.', requestId: req.id },
      });
    }

    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return reply.code(401).send({
        error: { code: 'UNAUTHENTICATED', message: 'Falta el token de autenticación.', requestId: req.id },
      });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return reply.code(401).send({
        error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado.', requestId: req.id },
      });
    }

    req.auth = {
      userId: data.user.id,
      role: data.user.user_metadata?.role ?? 'student',
    };
  };
}
```

---

## 6) Mezcla de patrones de manejo de errores

### Bug
El proyecto mezcla varios patrones:

- `throw AppError` en algunos módulos,
- `sendError(reply, error, requestId)` en rutas y en otros puntos,
- un global error handler centralizado,
- respuestas manuales en middleware y rutas.

Esto rompe trazabilidad y provoca inconsistencias de respuesta.

### Impacto
Medio/alto. Los errores no se comportan igual en toda la aplicación y complican diagnósticos.

### Solución óptima
Elegir un solo patrón:

1. dominio/servicio lanza `AppError` o errores específicos,
2. `Fastify` centraliza la serialización,
3. rutas no manejan errores manualmente salvo casos muy justificados.

### Patrón recomendado
```js
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
      error: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.', requestId: req.id },
    });
  }

  req.log.error({ err }, 'Error no controlado');
  return reply.code(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.', requestId: req.id },
  });
}
```

---

## 7) Búsquedas y rendimiento en MongoDB

### Bug
En listados como `reading.repository.js` se usan:

- `$lookup` a `users` para cada consulta de listado,
- `$or` con regex para `title` y `summary`,
- `countDocuments(filter)` y `aggregate()` ejecutados en paralelo sin índices claros.

### Impacto
Medio. En producción, con volumen moderado, la consulta puede volverse lenta y costosa.

### Solución óptima
Aplicar un enfoque de índices mínimos y proyección consciente.

```js
db.readings.createIndex({ institutionId: 1, status: 1, updatedAt: -1 });
db.readings.createIndex({ institutionId: 1, status: 1, difficulty: 1 });
db.readings.createIndex({ institutionId: 1, status: 1, estimatedMinutes: 1 });
```

Y limitar el contenido devuelto por listado:

```js
const projection = {
  content: 0,
  media: 0,
  activities: 0,
  deletedAt: 0,
  institutionId: 0,
};
```

---

## 8) Coexistencia entre código legacy y código actual

### Bug
La aplicación mezcla módulos nuevos y de prueba/legacy en el mismo bootstrap de servidor:

- carga directa de módulos del feature `readings`,
- wiring de grupos, assignments, etc.,
- importaciones y comentarios de `ft/2023146` en `server.js`.

### Impacto
Medio. Hace difícil distinguir qué es vivo y qué es código residual.

### Solución óptima
Separar por módulos y dejar un bootstrap limpio.

```js
export async function buildServer({ withDb = true } = {}) {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    trustProxy: true,
  });

  await registerSecurityPlugins(fastify);
  await registerHealthRoutes(fastify);

  if (withDb) await connectDb();

  await registerAuthModule(fastify);
  await registerUsersModule(fastify);
  await registerReadingsModule(fastify);

  fastify.addHook('onClose', async () => {
    if (withDb) await closeDb();
  });

  return fastify;
}
```

---

## 9) Inconsistencia en archivos de errores y capas de dominio

### Bug
Las capas usan diferentes formas de definir errores:

- `shared/errors.js`
- `shared/errors/AppError.js`
- `shared/errors/errorHandler.js`

Esto genera conflicto semántico y riesgo de importar la versión equivocada.

### Impacto
Medio/alto. El equipo puede usar distintos tipos de error de forma no consistente.

### Solución óptima
Elegir un único modelo de error de aplicación y conservarlo como estándar del proyecto.

#### Opción recomendada
- Usar `apps/api/src/shared/errors/AppError.js` como único archivo estándar.
- Mantener `shared/errors.js` como re-export legacy solo si hace falta compatibilidad temporal.
- Eliminar duplicados y centralizar `ErrorCodes`.

---

## 10) Prioridad de corrección recomendada

### P1 (bloqueantes)
1. Unificar MongoDB y eliminar duplicación.
2. Corregir imports inexistentes y rutas inconsistentes.
3. Unificar autenticación y autorización.
4. Corregir CORS inseguro.

### P2 (muy importantes)
5. Centralizar error handling.
6. Preparar índices de MongoDB.
7. Eliminar legacy mezclado en bootstrap.

### P3 (mejoras)
8. Reforzar validación de payloads y mejora de logging.
9. Revisar props sensibles en logs.
10. Aclarar contratos de respuesta HTTP para frontend.

---

## Decisión final sobre códigos duplicados
Para el contexto del proyecto, la opción más conveniente es:

- conservar un único `shared/db.js` como fuente de verdad,
- un único `shared/errors/AppError.js` como capa de errores,
- un único middleware de autenticación (`shared/middleware/authenticate.js`),
- un único bootstrap de Fastify en `server.js` sin legado mezclado.

Esto encaja mejor con la arquitectura modular del proyecto: monolito modular con capas claras y responsabilidades delineadas, y evita que la base del sistema se vuelva frágil y difícil de mantener.

## Resultado esperado
Con estas decisiones, el proyecto gana:

- menor riesgo de arranque,
- más consistencia de comportamientos,
- mejor mantenibilidad,
- mejor trazabilidad,
- mejor preparación para producción.

Este documento se usa como referencia para la corrección técnica y la revisión QA del sistema.

