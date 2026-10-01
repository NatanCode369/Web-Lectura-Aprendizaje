# ADR-0003: Snapshot de asignaciones

## Contexto

Una lectura (`readings`) puede editarse después de asignarse a un grupo. Si `assignments` sólo guardara una referencia a `readings._id`, cualquier edición posterior (cambiar una pregunta, alterar puntos, agregar actividades) modificaría el contenido de tareas ya entregadas. Esto rompería la calificación histórica y generaría disputas.

## Decisión

Al crear una asignación, copiamos el contenido relevante de las actividades de la lectura a `assignments.activitySnapshot`. La copia es **inmutable** desde ese momento y contiene sólo lo necesario para calificar:

- `activityId`
- `type`
- `prompt`
- `options`
- `correctAnswer`
- `points`
- `order`

La lectura original sigue viva y editable; su `version` se guarda en `assignments.readingVersion` para trazabilidad.

## Consecuencias

**Positivas**
- Las tareas ya asignadas no cambian si el docente edita la lectura.
- El cálculo de puntuación y la retroalimentación son determinísticos.
- Los intentos se califican contra el snapshot, no contra la lectura actual.

**Negativas**
- Si el docente necesita "actualizar" una tarea con una lectura corregida, debe crear una nueva asignación.
- Duplica datos (aceptable: las actividades embebidas son pequeñas y no superan el límite de 16 MiB).

## Alternativas descartadas

1. **Referenciar sólo `readings._id` y versionar lecturas completas.** Complejo y obliga a mantener histórico de lecturas.
2. **Guardar `readingId` + `activityIds`.** Si la lectura cambia, la calificación se rompe igual.
3. **Copiar la lectura completa dentro de la asignación.** Duplica contenido textual innecesario (el texto de la lectura no se califica).