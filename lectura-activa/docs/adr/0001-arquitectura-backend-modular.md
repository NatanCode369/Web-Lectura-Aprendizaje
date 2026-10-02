# ADR-0001: Monolito modular con arquitectura por capas

- **Estado:** Aceptado
- **Fecha:** 2026-10-01

## Contexto

El backend necesita manejar lecturas, actividades, asignaciones y analítica sin introducir complejidad operacional prematura.

## Decisión

Se adopta un monolito modular con Fastify y capas de rutas, aplicación, dominio e infraestructura. Los controladores no consultan MongoDB directamente.

## Consecuencias

- Los límites de módulo son claros.
- Las reglas de negocio pueden probarse sin HTTP ni MongoDB.
- Un módulo puede extraerse posteriormente si las métricas lo justifican.

## Alternativas descartadas

Microservicios desde la primera versión y acceso directo a MongoDB desde las rutas.
