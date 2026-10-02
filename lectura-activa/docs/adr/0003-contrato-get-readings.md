# ADR-0003: Contrato de catálogo GET /api/v1/readings

- **Estado:** Aceptado
- **Fecha:** 2026-10-01

## Contexto

El contrato de frontend define un catálogo institucional de lecturas publicadas, paginado y filtrable. La implementación inicial devolvía más datos de los necesarios y permitía consultar drafts a roles de gestión.

## Decisión

`GET /api/v1/readings` devuelve exclusivamente lecturas `published` de la institución autenticada y responde con `{ data, pagination }`. Admite `search`, `difficulty`, `maxMinutes`, `page` y `limit`. El catálogo expone `authorName` mediante una referencia a `users`, y omite `content`, `activities`, `media`, `institutionId` y `deletedAt`.

## Consecuencias

- El frontend obtiene un contrato estable y compacto.
- Los drafts quedan fuera del catálogo público; su gestión corresponde a otros flujos de docente.
- Se añade un `$lookup` limitado a `users` para `authorName`.

## Alternativas descartadas

Devolver el documento completo, aceptar `institutionId` desde el cliente o usar el mismo endpoint para catálogo y gestión de borradores.
