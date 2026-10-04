# ADR-0004: Estrategia de analítica diaria

## Contexto

Los paneles del docente necesitan mostrar métricas agregadas (tareas completadas, puntaje promedio, tiempo promedio) por grupo y asignación. Recalcular en cada petición sobre `studentAssignments` y `activityAttempts` no escala: a 250 usuarios y varias asignaciones, cada apertura de panel genera agregaciones costosas.

## Decisión

Mantener una colección `analyticsDaily` con una fila por combinación `{ date, groupId, assignmentId }`, actualizada por un **job programado diario** (`analytics.jobs.js`) que recorre las asignaciones activas del día y hace upsert idempotente.

- Índice único `{ date: 1, groupId: 1, assignmentId: 1 }` garantiza idempotencia.
- El job se ejecuta vía Cloud Scheduler llamando a `POST /analytics/jobs/daily` con header `x-job-secret`.
- Los endpoints de lectura (`GET /analytics/groups/:groupId`, `GET /analytics/readings/:readingId`) sólo leen `analyticsDaily`.

## Consecuencias

**Positivas**
- Paneles rápidos: consultas por rango de fechas sobre una colección pequeña e indexada.
- Sin recalcular sobre `studentAssignments` en cada petición.
- Fácil de extender a métricas futuras (por actividad, por estudiante) sin tocar el modelo operativo.

**Negativas**
- Los datos tienen hasta 24 h de retraso. Aceptable para paneles docentes.
- Si el job falla, hay que reintentarlo o correrlo manualmente. Se mitiga con alertas en Atlas + logs JSON.

## Alternativas descartadas

1. **Incrementar `analyticsDaily` en cada envío de intento.** Introduce escrituras adicionales en el camino crítico del estudiante y complica la transacción. Se descarta por ahora; se reconsiderará si el retraso de 24 h no es aceptable.
2. **Consultar en vivo con agregaciones.** Costoso a escala y difícil de cachear.
3. **Recalcular por rango bajo demanda.** Duplica lógica y puede saturar la base en horarios pico.