# Errores críticos detectados en develop

## Alcance
Este documento clasifica los pendientes más graves detectados en la rama `develop` del proyecto `NatanCode369/Web-Lectura-Aprendizaje`. Está pensado para ser usado por el equipo como guía de corrección técnica y coordinación de trabajo.

No se trata de un listado genérico: cada punto incluye:
- problema real,
- impacto en arranque o flujo,
- solución recomendada,
- lógica del cambio para que el equipo comprenda por qué se corrige.

---

## Resumen ejecutivo
La rama tiene una base sólida en varias capas: configuración de entorno, validaciones de dominio, manejo de errores, acceso a MongoDB y flujo de autenticación. Sin embargo, hay varios problemas críticos que deben corregirse antes de considerar la rama estable:

1. El arranque del backend no está consistente.
2. Hay código legacy activo y código nuevo mezclado sin una separación clara.
3. La API incluye un stub de lectura en producción que devuelve datos falsos.
4. Hay importaciones rotas y referencias a archivos inexistentes.
5. Existen inconsistencias de autenticación/autorización entre rutas y middleware.
6. Hay cuellos de botella de rendimiento en consultas de MongoDB.
7. Hay varios patrones de flujo que convierten errores técnicos en respuestas de negocio incorrectas.

---

## Prioridad de corrección

### P0 — Bloqueantes / arranque
- `apps/api/src/server.js`
- `apps/api/src/modules/readings/readings.repository.js`
- `apps/api/src/modules/auth/auth.routes.js`
- `apps/api/src/modules/auth/auth.service.js`

### P1 — Críticos / flujo y seguridad
- `apps/api/src/shared/middleware/authenticate.js`
- `apps/api/src/shared/middleware/authorize.js`
- `apps/api/src/shared/authorization/policies.js`
- `apps/api/src/modules/readings/reading.service.js`

### P2 — Muy importantes / rendimiento y mantenimiento
- `apps/api/src/modules/readings/reading.repository.js`
- `apps/api/src/modules/studentAssignments/studentAssignments.service.js`
- `apps/api/src/modules/attempts/attempts.service.js`
- `apps/api/src/modules/analytics/analytics.jobs.js`

---

## 1) Arranque del servidor inconsistente

### Problema
Archivo: `lectura-activa/apps/api/src/server.js`

El archivo define una `buildServer()` que invoca funciones que no existen en el código actual:
- `registerSecurityPlugins`
- `registerHealthRoutes`
- `registerModules`

Además, el bloque funcional de la implementación real queda comentado dentro del mismo archivo. Eso deja el arranque en un estado intermedio:
- código nuevo en una rama,
- bloque legado comentado,
- funciones sin definir,
- y `start()` llamando a una construcción que no está realmente funcionando.

### Impacto
- El backend puede arrancar incompleto o no arrancar.
- El equipo no sabe qué versión del bootstrap es la correcta.
- Cualquier despliegue o prueba local puede romperse por un arranque no confiable.

### Solución recomendada
- Dejar una única implementación de `buildServer()` activa.
- Eliminar el bloque comentado que contiene código legacy.
- Registrar explícitamente:
  - seguridad,
  - health checks,
  - conexión a BD,
  - rutas de negocio,
  - hooks de cierre.

### Lógica del cambio
El objetivo es que el bootstrap sea un único punto de verdad. Si el backend tiene múltiples versiones de arranque, el equipo no puede saber qué código se ejecuta realmente. La solución consiste en una sola función `buildServer()` con flujo determinista:
1. crear Fastify,
2. aplicar seguridad,
3. registrar health,
4. conectar DB,
5. registrar módulos,
6. cerrar DB al apagar.

Esto hace que arranque, pruebas automatizadas y despliegues sean predecibles.

---

## 2) Código legacy mezclado con código activo

### Problema
Archivo: `lectura-activa/apps/api/src/server.js`

El bootstrap importa módulos de varios contextos: módulos principales, módulos de lectura, módulos legacy y referencias explícitas a `ft/2023146`.

Esto rompe la claridad de responsabilidad y genera varios efectos:
- la capa de bootstrap conoce detalles de negocio,
- se mezclan módulos activos y experimentales,
- los cambios reales en una parte del sistema afectan el arranque global.

### Impacto
- Dificultad de mantenimiento.
- Riesgo de regresión por cambios aparentemente aislados.
- El arreglo de un problema requiere revisar el entorno completo del servidor.

### Solución recomendada
- Un módulo por dominio.
- Un único bootstrap sin legado.
- Cada módulo debe registrarse desde su propio bloque funcional.

### Lógica del cambio
La responsabilidad del archivo `server.js` no es llevar el historial del proyecto ni integrar versiones antiguas. Su responsabilidad es inicializar el servicio. Cuando ese archivo mezcla legacy, la arquitectura se vuelve opaca. La corrección es aislar cada módulo y dejar `server.js` lo más pequeño posible.

---

## 3) Stub en producción para lecturas: datos falsos

### Problema
Archivo: `lectura-activa/apps/api/src/modules/readings/readings.repository.js`

Este archivo es un stub temporal que devuelve objetos mockeados con `console.warn()` en vez de consultar MongoDB real:
- `findById()` devuelve un objeto inventado,
- `findByIdAndVersion()` devuelve otro objeto inventado,
- la lógica de negocio de `assignments` depende de estos datos para validaciones.

Esto es crítico porque convierte la lógica de negocio en un entorno falso.

### Impacto
- El sistema puede “pasar” validaciones con datos inventados.
- La aplicación puede funcionar en pruebas mientras la base de datos real no se usa.
- Los flujos reales de lectura/assignación quedan bloqueados o con datos inconsistentes.

### Solución recomendada
Eliminar el stub o moverlo solo a un entorno de pruebas explícito. El repositorio de lecturas real debe conectarse a MongoDB y respetar el contrato del dominio.

### Lógica del cambio
Un stub en producción rompe la integridad del sistema: si una entidad es usada por una parte del negocio para decidir permisos o estados, no puede ser “mockeada” porque encubre errores reales. El equipo necesita un contrato real en MongoDB y no una versión simulada que pase test de forma falsa.

---

## 4) Importaciones rotas y archivos inexistentes

### Problema
Se detectan importaciones a rutas que no existen o que no son consistentes con la estructura actual del proyecto.

Ejemplos detectados:
- `lectura-activa/apps/api/src/modules/auth/auth.routes.js` importa desde `../../shared/errors.js`, pero la capa real es `../../shared/errors/AppError.js`.
- En otros puntos se mezclan imports de `shared/errors.js`, `shared/errors/AppError.js` y `shared/errors/index.js`.
- La aplicación tiene varias capas de error y varias "APIs" de la misma responsabilidad.

### Impacto
- El proyecto puede romper al arrancar.
- El equipo depende de importaciones inconsistentes.
- Las rutas y servicios quedan frágiles a cambios de estructura.

### Solución recomendada
- Definir un único punto de entrada para errores.
- Un solo patrón de importación.
- Eliminar re-export legacy si no es necesario.

### Lógica del cambio
Cuando el sistema tiene varias definiciones de la misma responsabilidad, los desarrolladores no saben qué usar. Lo correcto es un único estándar: una única clase base de error, una sola API de manejo de errores y una sola estructura de import dentro del backend.

---

## 5) Inconsistencia en la autenticación y autorización

### Problema
Hay varios módulos y patrones mezclados:
- `shared/middleware/authenticate.js`
- `shared/middleware/authorize.js`
- `shared/authorization/policies.js`
- `shared/auth/session.js`
- rutas usando `request.user` y otras usando `req.auth`

Además, `reading.routes.js` importa `requireRoles` desde `../../shared/auth.js`, pero ese archivo no existe en la estructura actual. Eso evidencia un patrón de mezcla de modelos de autenticación.

### Impacto
- Mismo concepto con dos nombres distintos.
- Un usuario podría autenticarse en una ruta y no en otra.
- Los permisos no son consistentes entre módulos.
- El sistema no escala bien cuando soluciones de seguridad se implementan por “parcheo”.

### Solución recomendada
- Un único middleware de autenticación.
- Un único contrato `request.user` o `req.user`.
- Un solo conjunto de políticas de autorización.

### Lógica del cambio
La seguridad debe ser una frontera clara y uniforme. Si el equipo usa varios modelos simultáneamente, la validación de permisos se vuelve dependiente del orden de importación, del código de la ruta y del contexto del módulo. Eso es la definición de un sistema poco confiable.

---

## 6) `auth.routes.js` tiene un flujo de error incorrecto y un código roto

### Problema
Archivo: `lectura-activa/apps/api/src/modules/auth/auth.routes.js`

El archivo intenta usar:
- `AppError.unauthorized(...)`
- `ErrorCodes.UNAUTHORIZED_HOOK`

Pero en el código actual no debería depender de un `shared/errors.js` inexistente; además no se importa `ErrorCodes` en ese archivo. Esto hace que la ruta falle incluso antes de ejecutarse correctamente.

### Impacto
- El endpoint interno de validación de dominio puede romperse.
- El sistema de registro / creación de usuarios podría fallar si se usa Supabase.
- La validación de dominio no es confiable.

### Solución recomendada
- Importar solamente desde `../../shared/errors/AppError.js`.
- Importar `ErrorCodes` y usarlo explícitamente.
- Mantener el contrato del hook con una firma clara y consistente.

### Lógica del cambio
El hook de dominio es una puerta de entrada del sistema comparada con un servicio público. Si falla por una importación rota o por una mala convención de error, el flujo de integración con Supabase queda interrumpido. Debe ser robusto y predecible.

---

## 7) `AuthService.ensureUserFromJwt` convierte errores técnicos en forbidden

### Problema
Archivo: `lectura-activa/apps/api/src/modules/auth/auth.service.js`

El método `ensureUserFromJwt()` usa `throw AppError.forbidden()` en el `catch` de creación de usuario, sin distinguir entre:
- conflicto por duplicado,
- error de base de datos,
- problema de validación,
- problema de infraestructura.

Eso hace que un fallo real de MongoDB o de lógica interna aparezca como “no tienes permisos”.

### Impacto
- Los errores se esconden bajo un código incorrecto.
- La depuración se vuelve más difícil.
- Un equipo de soporte o QA no puede distinguir entre un permiso denegado y un error del sistema.

### Solución recomendada
Dividir los casos:
- 409/CONFLICT para duplicados o condiciones de carrera,
- 500 o 503 para errores internos de infraestructura,
- 403 solo para dominio no autorizado.

### Lógica del cambio
La semántica de HTTP y del dominio debe ser coherente. Un problema de infraestructura no es un permiso. Si el código dichoso siempre devuelve `forbidden`, la aplicación se vuelve engañosa y la operación real no puede corregirse con precisión.

---

## 8) Flujo de `listMine` y `getMine` con N+1 queries y muchos joins implícitos

### Problema
Archivo: `lectura-activa/apps/api/src/modules/studentAssignments/studentAssignments.service.js`

El servicio hace varias consultas por cada item en el listado:
- `assignmentsRepository.findById(id)` para cada assignment,
- luego `readingsRepository.findById()` y `groupsRepository.findById()` por cada id,
- y se hace a través de `Promise.all`, pero el patrón sigue siendo un N+1 en volumen real.

### Impacto
- El servicio no escala bien con muchos elementos.
- Un listado con 50/100 elementos puede disparar centenares de consultas.
- El rendimiento se degrada en la base y en la red.

### Solución recomendada
- Traer asignaciones, lecturas y grupos en lote con consultas por conjunto de ids.
- Usar agregaciones o proyecciones más eficientes.
- Evitar enriquecer elementos uno a uno cuando puede hacerse por mapa.

### Lógica del cambio
El problema no es solo la cantidad total de datos; es la forma de resolver las dependencias. Cuando cada item dispara una consulta, la carga crece casi linealmente con el número de elementos. El diseño correcto es agrupar por ids y resolver en batch.

---

## 9) Búsquedas con regex sin índices en `reading.repository.js`

### Problema
Archivo: `lectura-activa/apps/api/src/modules/readings/reading.repository.js`

El listado usa regex en `title` y `summary` y no hay un plan de índices mínimo para esta consulta:
- `institutionId`,
- `status`,
- `difficulty`,
- `estimatedMinutes`,
- `updatedAt`.

### Impacto
- El rendimiento de lectura deteriora con volumen medio/alto.
- La proyección del listado no elimina la carga innecesaria.
- Las consultas de búsqueda pueden hacerse muy caras.

### Solución recomendada
- Crear índices sobre combinaciones útiles.
- Si la búsqueda de texto se usa de verdad, usar índices textuales o una estrategia de búsqueda adecuada.
- Proyectar solo campos realmente necesarios.

### Lógica del cambio
La base da servicio a una API; si la búsqueda y el listado no tienen soporte de índices, cada query se convierte en un scan completo. Esto genera consumo innecesario de CPU y memoria, y puede afectar a toda la app.

---

## 10) Sistemas de autorización mezclados (`requireRole` y `requireRoles`)

### Problema
Hay dos patrones de autorización:
- `shared/middleware/authorize.js` define `requireRole` y usa `req.auth`
- `shared/authorization/policies.js` define otra función `requireRole` y usa `request.user`
- `reading.routes.js` usa `requireRoles`, pero no existe un archivo `shared/auth.js` con esa firma

### Impacto
- El código es inconsistente en nombres y propiedades del request.
- Los middlewares no se pueden reutilizar sin adaptaciones.
- El estándar de seguridad no está fijado.

### Solución recomendada
- Eliminar duplicados.
- Centralizar una sola API de autorización por rol.
- Mantener un único contrato de usuario autenticado en el request.

### Lógica del cambio
Cada ruta debe depender de un contrato único para no introducir errores por diferencias de nombres. Si la autorización cambia de `req.auth` a `request.user`, cada endpoint debe respetar lo mismo. La repetición de definiciones es un síntoma claro de falta de estandarización.

---

## 11) Validación de paginación mínima ausente

### Problema
En varios repositorios se usa paginación sin validar `page` ni `limit` antes de aplicar `skip` y `limit`:
- `groups.repository.js`
- `assignments.repository.js`
- `studentAssignments.repository.js`
- `reading.repository.js`

### Impacto
- `page = 0` o `limit = 0` pueden producir errores lógicos o resultados vacíos sin control.
- `limit` no acotado puede hacer consultas muy costosas.

### Solución recomendada
Establecer un validador común de paginación:
- `page >= 1`
- `limit >= 1`
- `limit <= MAX_LIMIT`

### Lógica del cambio
La paginación no es un detalle de UX; es parte de la integridad del backend. Si el input no se valida, un cliente malicioso o incluso un consumidor ingenuo puede generar consultas costosas o resultados ambiguos.

---

## 12) Errores de semántica en los códigos HTTP

### Problema
Hay varios puntos donde el estado HTTP no refleja el problema real:
- `AppError.forbidden()` en errores de infraestructura,
- `AppError.badRequest` con nombres genéricos como `VALIDATION_ERROR` usados para más de un caso,
- `AppError.conflict` para estados que en realidad son errores de negocio o no autorizados.

### Impacto
- El frontend y el cliente no pueden distinguir bien entre validación, autorización y fallo técnico.
- La trazabilidad del error se pierde.

### Solución recomendada
- Mantener un catálogo explícito de códigos de error.
- No reutilizar un código para varias intenciones.
- Usar 400/401/403/404/409/500 de forma semánticamente consistente.

### Lógica del cambio
El protocolo HTTP es una interfaz de negocio y de diagnóstico. Si los errores se mezclan, no solo el cliente recibe una respuesta poco clara, sino que el equipo también pierde capacidad de depurar.

---

## 13) Duplicación de responsabilidad en `Groups` y `Assignments`

### Problema
En varias partes del trabajo del equipo se revisan grupos y asignaciones sin una separación clara entre:
- validación de dominio,
- permisos,
- persistencia,
- consulta enriquecida.

Esto aparece en `groups.service.js`, `assignments.service.js` y en los repositorios relacionados.

### Impacto
- Cada servicio termina siendo un orquestador de todas las capas.
- Se diluye la responsabilidad única.
- El desarrollo se vuelve más difícil y más frágil.

### Solución recomendada
- Mantener en servicio la lógica de caso de uso.
- Mantener en repositorio la persistencia.
- Mantener en dominio la validación.

### Lógica del cambio
La separación de responsabilidades reduce el riesgo de regresión. Cuando la lógica de negocio, la validación y la persistencia se mezclan, cualquier cambio requiere revisar más capas y aumentar la superficie de error.

---

## 14) Datos de análisis y jobs diurnos sin límites ni validación

### Problema
Archivo: `lectura-activa/apps/api/src/modules/analytics/analytics.jobs.js`

El job recorre todas las asignaciones activas en un rango de fechas y hace un cálculo por asignación. No hay protección cuando la cantidad de registros crece demasiado.

### Impacto
- El job puede volver lento.
- El cálculo diario puede afectar a la base en horas de pico.
- No existe control de reintentos ni de por qué falla si el job vuelve a ejecutarse y hay más registros de los esperados.

### Solución recomendada
- Añadir límites y validación de rango de fechas.
- Revisar eficiencia de cálculo por lote.
- Considerar `batchSize` y logging de progreso.

### Lógica del cambio
Este tipo de jobs debe ser predecibles. Cuando un proceso de analytics agrega todos los datos sin estrategia de lote, a medida que crece el volumen, el job puede convertirse en cuello de botella del sistema.

---

## Recomendación operativa para el equipo

### Fase 1 — Corregir bloqueantes
1. Reparar `server.js`.
2. Eliminar stub de `readingsRepository` en producción.
3. Corregir imports rotos y errores de capas.
4. Unificar la autenticación/autorización.

### Fase 2 — Normalizar flujo y dominio
1. Arreglar `AuthService.ensureUserFromJwt`.
2. Invalidar la mezcla de `req.auth` y `request.user`.
3. Unificar `AppError` y códigos HTTP.

### Fase 3 — Mejorar rendimiento y mantenimiento
1. Añadir índices mínimos para MongoDB.
2. Validar paginación común.
3. Reducir N+1 en listas de `studentAssignments`.
4. Reforzar jobs de analytics.

---

## Cierre
La rama `develop` no está en un estado de “listo para consolidar”, pero tampoco está rota en todas las capas. Hay una base correcta en varias decisiones, pero la ejecución real está comprometida por:
- arranque inconsistente,
- stubs en producción,
- importaciones rotas,
- mezcla de políticas de seguridad,
- flujo de error engañoso,
- y riesgos de rendimiento visibles.

Si el equipo corrige estos puntos de manera coordinada, el proyecto pasará de ser un monolito con varias corrientes de trabajo a una base mucho más segura, predecible y mantenible.

Este documento sirve como referencia para corregir de forma ordenada con todo el equipo.
