# ADR-0002: MongoDB y actividades embebidas

- **Estado:** Aceptado
- **Fecha:** 2026-10-01

## Contexto

Las actividades tienen configuraciones variables y se leen junto con la lectura. Sus intentos, en cambio, pueden crecer sin límite.

## Decisión

Las actividades se embeben en `readings`. Las relaciones y colecciones con crecimiento independiente se mantienen como referencias. Los identificadores persistentes usan `ObjectId`.

## Consecuencias

- Una lectura puede recuperarse con su configuración de actividades en una sola lectura documental.
- Los historiales de intentos no inflan el documento de lectura.
- Las consultas nuevas deben justificar sus índices.

## Alternativas descartadas

Una colección independiente de actividades para toda configuración y almacenar historial dentro de `readings`.
