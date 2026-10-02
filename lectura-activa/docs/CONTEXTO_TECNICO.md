# Lectura Activa — Contexto técnico compartido

## Producto

Lectura Activa es una aplicación web para estudiantes de secundaria que mejora la comprensión lectora mediante textos breves y actividades. Los docentes crean contenido, lo asignan a grupos y consultan el progreso.

## Arquitectura

La primera versión usa un monolito modular con API REST y capas separadas:

- Cliente web estático, fuera del alcance de esta fase.
- API Node.js con Fastify en `apps/api`.
- MongoDB Atlas para los datos operativos.
- Supabase Auth para identidad, sesiones, verificación y recuperación de contraseña.
- Supabase Storage privado para archivos multimedia.

La API es la única capa que accede a MongoDB. El navegador nunca recibe credenciales de base de datos ni claves secretas.

## Capas del API

Cada módulo sigue este flujo:

```text
Ruta HTTP → middleware → servicio → dominio/repositorio → MongoDB o servicio externo
```

- `routes`: endpoints, códigos HTTP y validación de entrada.
- `service`: casos de uso y orquestación.
- `domain`: reglas puras, sin I/O.
- `repository`: consultas y persistencia.
- `shared`: configuración, base de datos, errores, logger, autenticación y autorización.

## Entidades iniciales

La colección `users` contiene `authUserId`, `email`, `fullName`, `role`, `institutionId`, `status`, `profile`, `createdAt` y `updatedAt`. La colección `institutions` contiene `name`, `allowedEmailDomains`, `settings`, `status`, `createdAt` y `updatedAt`.

Los correos se normalizan a minúsculas. Las contraseñas y los tokens de sesión pertenecen exclusivamente a Supabase Auth.

## Seguridad

- El registro valida el dominio contra `institutions.allowedEmailDomains` antes de crear la cuenta.
- La API valida el JWT de Supabase y construye `req.auth` desde el perfil de MongoDB.
- Nunca se registran contraseñas, tokens ni datos sensibles.
- Los secretos viven en variables de entorno y no se versionan.
- Las entradas HTTP se validan en la frontera y las invariantes se comprueban en el dominio o servicio.

## Convenciones

- Código en JavaScript con módulos ES y nombres en inglés.
- Fechas en UTC.
- Identificadores MongoDB con `ObjectId` cuando corresponda.
- Las escrituras reintentables deben ser idempotentes.
- Cada nueva consulta frecuente debe justificar sus índices en `database/indexes`.
- Los cambios arquitectónicos relevantes se documentan como ADR numerados en `docs/adr`.