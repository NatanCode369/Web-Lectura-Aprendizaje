# ADR 0003: Modelo de entidades base

## Contexto

La primera fase necesita un modelo mínimo para instituciones y usuarios, con espacio para extender el dominio educativo.

## Decisión

Se usarán las colecciones `institutions` y `users`. Los usuarios referencian una institución mediante `institutionId`; ambos documentos incluyen fechas UTC y estado lógico.

## Consecuencias

- `authUserId` identifica la cuenta de Supabase relacionada.
- Los correos de usuarios se normalizan y se indexan de forma única.
- Las consultas de autorización pueden filtrar por institución, rol y estado.