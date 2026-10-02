# ADR 0002: Validación del dominio durante el registro

## Contexto

El registro debe limitarse a correos institucionales autorizados y evitar crear cuentas para dominios desconocidos.

## Decisión

Antes de crear el usuario en Supabase Auth, la API consultará `institutions.allowedEmailDomains`. El correo se normalizará a minúsculas y el dominio deberá coincidir con una institución activa.

## Consecuencias

- La validación ocurre antes de crear la identidad externa.
- Las instituciones controlan sus dominios permitidos desde MongoDB.
- Los registros no autorizados reciben un error de dominio sin crear una cuenta.