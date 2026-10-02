# Documentación del backend de Lectura Activa

## Fuentes contractuales

- `CONTEXTO_TECNICO.md`: arquitectura, seguridad, modelo de datos y reglas generales.
- `entities.md`: contrato de entidades base, especialmente tipos y estados de `users` e `institutions`.
- `Contrato apiv1readings.md`: contrato público de `GET /api/v1/readings`.

## Backend de lecturas

`apps/api/src/modules/readings/` implementa creación, edición, publicación y consulta de lecturas. Las actividades se validan como configuración embebida dentro de `readings`.

## Contrato GET /api/v1/readings

El catálogo devuelve únicamente lecturas `published` de la institución del usuario autenticado. Admite `search`, `difficulty`, `maxMinutes`, `page` y `limit`. La respuesta contiene `data` y `pagination`; no expone `institutionId`, `deletedAt`, `content`, `activities` ni `media`.

`authorName` se obtiene mediante referencia a `users.fullName`.

## Errores

Las respuestas siguen `{ error: { code, message, requestId } }`. Los parámetros inválidos del catálogo devuelven HTTP 400 con código `INVALID_QUERY`; autenticación fallida devuelve 401; autorización insuficiente, 403; rate limit, 429; errores inesperados, 500.

## Pruebas

Las pruebas unitarias viven en `apps/api/tests/`. Los flujos de integración contra MongoDB deben ejecutarse con una base de datos de pruebas aislada.
