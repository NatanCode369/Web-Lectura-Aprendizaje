# ADR 0001: Autenticación con Supabase y MongoDB

## Contexto

La aplicación necesita autenticación segura sin almacenar contraseñas propias, además de un perfil operativo consultable por la API.

## Decisión

Supabase Auth será la fuente de identidad y sesiones. MongoDB almacenará el perfil de aplicación en `users`, relacionado mediante `authUserId`. La API validará el JWT de Supabase y aplicará autorización usando el perfil de MongoDB.

## Consecuencias

- No se almacenan contraseñas ni sesiones en MongoDB.
- La API necesita las credenciales públicas de Supabase y, para operaciones administrativas, la service role key.
- La identidad externa y los datos operativos tienen responsabilidades separadas.