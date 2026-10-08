# Notas — Roles por whitelist

**Autor:** Diego (P2)
**Fecha:** 07 de Octubre, 2026
**Relacionado con:** ADR 0006, revisión externa N4

## Qué se implementó

Dos whitelists en MongoDB (`admins` y `teachers`). El rol se resuelve en el primer login y se actualiza si cambia.

## Correos actuales

- **Admins:** `aaguilar-2023146@kinal.edu.gt`, `jmazul-2023430@kinal.edu.gt`
- **Teachers:** `marbinaquino@kinal.edu.gt`
- **Resto:** `student`

## Cómo añadir un docente o admin

**Opción A — Mongo Shell:**
```js
db.teachers.insertOne({ email: 'nuevo@kinal.edu.gt', addedBy: null, createdAt: new Date() })
db.admins.insertOne({ email: 'otro@kinal.edu.gt', addedBy: null, createdAt: new Date() })
