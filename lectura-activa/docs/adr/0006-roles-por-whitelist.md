# ADR 0006 — Roles por whitelist

- **Estado:** Aceptado
- **Fecha:** 07 de Octubre, 2026
- **Responsable:** Diego (P2 — Backend de identidad y usuarios)
- **Revisores:** P1 (Líder técnico), P7 (Plataforma)

## Contexto

Hoy el registro siempre crea usuarios con `role: 'student'`. **No hay forma de que un docente o admin obtenga su rol** salvo tocar la DB a mano.

Esto bloquea:
- Probar pantallas de docente.
- Que el profesor real acceda a su panel.
- Que haya admins gestionando el sistema.

## Decisión

Se implementan **dos whitelists** en MongoDB:

- **`admins`** — correos con `role: 'admin'`.
- **`teachers`** — correos con `role: 'teacher'`.

Todo correo que **no esté en ninguna lista** → `role: 'student'`.

### Estado inicial

```js
admins = [
  'aaguilar-2023146@kinal.edu.gt',
  'jmazul-2023430@kinal.edu.gt',
];
teachers = [
  'marbinaquino@kinal.edu.gt',
];