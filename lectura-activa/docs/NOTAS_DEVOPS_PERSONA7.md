# Nota de trabajo - Persona 7

**Proyecto:** Lectura Activa  
**Fecha:** 05 de octubre de 2026  
**Responsable:** Persona 7  
**Referencia:** Problema #2 de `QA_BUGS_SOLUCIONES.md`

## 1. Objetivo

Corregir las inconsistencias en los nombres y el acceso a las variables de
entorno utilizadas por la API, y dejar documentado el estado de la
configuración de infraestructura solicitado por el equipo de DevOps.

## 2. Cambios realizados

### 2.1 Convención única de variables de entorno

Se unificó el acceso a la configuración de la API usando nombres
`SCREAMING_SNAKE_CASE` mediante `env`, por ejemplo:

```js
env.MONGODB_URI
env.MONGODB_DB
env.SUPABASE_URL
env.SUPABASE_ANON_KEY
env.INTERNAL_HOOK_SECRET
env.ANALYTICS_JOB_SECRET
```

La conexión principal de MongoDB se mantiene en
`apps/api/src/shared/db.js`, que utiliza:

```js
new MongoClient(env.MONGODB_URI);
client.db(env.MONGODB_DB);
```

También se actualizó el script de índices para usar `MONGODB_DB` y se
eliminó la referencia antigua `MONGODB_DB_NAME`.

### 2.2 Configuración de la API

Se centralizó el uso de `env` en el arranque del servidor y en el manejador de
errores. También se documentaron las variables relacionadas con:

- entorno y puerto;
- conexión a MongoDB;
- Supabase;
- secreto del hook interno;
- secreto del job diario de analítica;
- orígenes permitidos por CORS.

Los archivos `.env.example` deben contener únicamente valores de ejemplo. No
se deben subir al repositorio claves reales, contraseñas ni URI con
credenciales.

### 2.3 Configuración de las pruebas

El script de pruebas de la API se ajustó para ejecutar Vitest:

```json
"test": "vitest run"
```

La suite se ejecuta desde:

```powershell
cd lectura-activa\apps\api
npm test
```

Durante la validación se identificaron fallos pendientes en la conexión
aislada de MongoDB Memory Server para las pruebas de integración y
autorización. Esos 29 fallos quedan fuera del alcance de esta entrega y se
retomarán posteriormente.

## 3. Nota DevOps

### 3.1 Datos base de `users`

Se creó la estructura base de la colección `users` mediante la migración
inicial de MongoDB. Esta colección forma parte del modelo base de la
aplicación y se utiliza para almacenar los perfiles asociados a usuarios de
Supabase Auth.

La migración se encuentra en:

```text
database/migrations/0001-initial-collections.js
```

La carga o actualización de registros concretos de usuarios debe realizarse
con el seed o procedimiento acordado por DevOps. No se documentan aquí datos
personales ni credenciales.

### 3.2 Conexión con MongoDB Atlas

Se logró conectar MongoDB con MongoDB Atlas utilizando la variable de entorno
`MONGODB_URI` y la base indicada por `MONGODB_DB`.

La URI debe configurarse de forma privada en el entorno de ejecución. No debe
publicarse en `.env.example`, commits, documentación pública ni mensajes del
repositorio.

La API utiliza esta configuración centralizada:

```env
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/...
MONGODB_DB=lectura_activa
```

Los valores reales deben ser proporcionados mediante el administrador de
secretos o las variables protegidas del entorno correspondiente.

## 4. Estado de validación

### Correcto

- La API tiene una convención única para los nombres de variables de entorno.
- La conexión principal usa `env.MONGODB_URI` y `env.MONGODB_DB`.
- El script de pruebas utiliza Vitest.
- Las pruebas unitarias principales pasan.
- La estructura base de `users` está contemplada por la migración.
- La conexión de desarrollo con MongoDB Atlas fue realizada.

### Pendiente

- Corregir el aislamiento de MongoDB Memory Server en las pruebas de
  integración y autorización.
- Ejecutar nuevamente la suite después de corregir esa conexión.
- Confirmar los registros de usuarios base en Atlas mediante el procedimiento
  de seed definido por DevOps.

## 5. Recomendaciones operativas

1. Mantener los secretos únicamente en variables protegidas o en un `.env`
   local no versionado.
2. Verificar que `MONGODB_URI` y `MONGODB_DB` estén definidos en cada entorno.
3. No mezclar nombres antiguos como `MONGODB_DB_NAME`,
   `env.mongodbUri` o `env.mongodbDbName`.
4. Ejecutar las migraciones y seeds contra la base seleccionada explícitamente
   antes de validar los endpoints dependientes de MongoDB.
5. Usar una base aislada para las pruebas y no ejecutar pruebas destructivas
   contra producción o contra el cluster compartido de Atlas.
