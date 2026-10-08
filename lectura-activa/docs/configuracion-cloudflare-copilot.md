# Instrucciones para configurar Cloudflare en Lectura Activa

## Objetivo

Ayúdame a configurar correctamente Cloudflare para el repositorio `NatanCode369/Web-Lectura-Aprendizaje`.

Debes trabajar con mucho cuidado porque tengo poca experiencia con Cloudflare, Cloud Run, Workers y variables de entorno. Explica cada paso en español sencillo y no des por hecho que conozco los conceptos técnicos.

La arquitectura objetivo es:

```text
Frontend en Vercel
        |
        | HTTPS
        v
Cloudflare Worker: https://api.MI_DOMINIO.com/api/*
        |
        | añade x-origin-secret y x-client-ip
        v
Backend en Cloud Run
        |
        +--> MongoDB Atlas
        +--> Supabase
```

El backend ya contiene integración con Cloudflare mediante:

- `ORIGIN_SHARED_SECRET`
- `REQUIRE_EDGE`
- Header `x-origin-secret`
- Header `x-client-ip`

El Worker existente está en:

```text
lectura-activa/apps/edge/
```

Archivos importantes:

```text
lectura-activa/apps/edge/wrangler.toml
lectura-activa/apps/edge/src/worker.js
lectura-activa/apps/edge/README.md
lectura-activa/apps/api/src/config/env.js
lectura-activa/apps/api/src/shared/edge.js
lectura-activa/apps/api/src/server.js
```

## Reglas importantes

1. Antes de modificar cualquier archivo, inspecciona el contenido actual y entiende cómo funciona.
2. No inventes rutas, nombres de variables ni endpoints. Comprueba primero que existan en el repositorio.
3. No elimines funcionalidad existente.
4. No subas secretos reales al repositorio.
5. No escribas valores secretos en `wrangler.toml`, archivos `.js`, `.md` o archivos de configuración versionados.
6. Usa placeholders como `MI_DOMINIO.com`, `URL_DE_CLOUD_RUN` y `SECRETO_GENERADO`.
7. No pongas `SUPABASE_SERVICE_ROLE_KEY` ni ningún secreto en el frontend.
8. No cambies `REQUIRE_EDGE=true` automáticamente sin explicar primero las consecuencias.
9. La configuración debe poder probarse primero con `REQUIRE_EDGE=false`.
10. Si detectas que el código actual no coincide con estas instrucciones, detente y explica la diferencia antes de modificarlo.
11. No ejecutes comandos destructivos.
12. No borres bases de datos, despliegues, secretos ni configuraciones existentes.
13. Si una acción requiere entrar en Cloudflare, Cloud Run, Vercel, MongoDB Atlas o Supabase, dame instrucciones claras para hacerla manualmente desde el panel.

## Resultado esperado

Quiero dejar preparado el repositorio para que:

- El Worker de Cloudflare reenvíe únicamente las rutas `/api/*`.
- El Worker envíe las peticiones hacia Cloud Run.
- El Worker añada `x-origin-secret`.
- El Worker añada `x-client-ip` con la IP real del usuario.
- Cloud Run pueda verificar el secreto compartido.
- El frontend pueda utilizar una URL como `https://api.MI_DOMINIO.com/api`.
- Las cookies HttpOnly sigan funcionando.
- CORS permita únicamente el dominio real del frontend.
- La configuración sea segura y no exponga secretos.

## Fase 1: inspección

Primero revisa estos archivos y responde con un resumen antes de cambiar nada:

1. `lectura-activa/apps/edge/wrangler.toml`
2. `lectura-activa/apps/edge/src/worker.js`
3. `lectura-activa/apps/edge/README.md`
4. `lectura-activa/apps/api/src/config/env.js`
5. `lectura-activa/apps/api/src/shared/edge.js`
6. `lectura-activa/apps/api/src/server.js`
7. `lectura-activa/docs/despliegue-guia.md`
8. Los archivos de configuración del frontend donde se use `VITE_API_URL`.

En el resumen indica:

- Qué ya está correctamente configurado.
- Qué falta configurar.
- Qué archivos necesitan cambios.
- Qué pasos deben hacerse manualmente fuera del repositorio.
- Qué riesgos o inconsistencias existen.

## Fase 2: configuración del Worker

Comprueba que `lectura-activa/apps/edge/wrangler.toml` tenga una estructura equivalente a esta, usando placeholders y sin secretos:

```toml
name = "lectura-activa-api"
main = "src/worker.js"
compatibility_date = "2025-01-01"

[vars]
# Sustituir manualmente por la URL real de Cloud Run.
# No debe terminar en una barra y no debe incluir /api.
ORIGIN_URL = "https://URL_DE_CLOUD_RUN.run.app"
```

No añadas `ORIGIN_SHARED_SECRET` a `wrangler.toml`. Ese valor debe guardarse mediante:

```bash
npx wrangler secret put ORIGIN_SHARED_SECRET
```

Comprueba que el Worker:

- Rechace rutas que no comiencen por `/api/`.
- Reenvíe método, query string, headers y body.
- Elimine cualquier `x-origin-secret` enviado por el cliente.
- Elimine cualquier `x-client-ip` enviado por el cliente.
- Añada el secreto verdadero desde `env.ORIGIN_SHARED_SECRET`.
- Añada `x-client-ip` utilizando `cf-connecting-ip`.
- Devuelva errores claros si faltan variables.
- No valide JWT; esa responsabilidad corresponde al backend.

Si haces cambios en el Worker, mantén este comportamiento.

## Fase 3: dominio de Cloudflare

Explícame cómo configurar manualmente en Cloudflare un subdominio para el Worker:

```text
api.MI_DOMINIO.com
```

Indica claramente si se debe utilizar:

- Custom Domain de Workers; o
- Route de Workers.

Recomienda una sola opción para una persona principiante y explica por qué.

Aclara que `api.MI_DOMINIO.com` debe ser el dominio que utilice el frontend para llamar a la API.

## Fase 4: Cloud Run

Genera una lista de variables que debo configurar en Cloud Run, usando placeholders:

```dotenv
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@CLUSTER.mongodb.net
MONGODB_DB=lectura_activa
SUPABASE_URL=https://MI_PROYECTO.supabase.co
SUPABASE_ANON_KEY=MI_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=MI_SERVICE_ROLE_KEY
COOKIE_SECRET=SECRETO_GENERADO_1
INTERNAL_HOOK_SECRET=SECRETO_GENERADO_2
ANALYTICS_JOB_SECRET=SECRETO_GENERADO_3
FRONTEND_URL=https://app.MI_DOMINIO.com
CORS_ORIGINS=https://app.MI_DOMINIO.com
ORIGIN_SHARED_SECRET=SECRETO_GENERADO_4
REQUIRE_EDGE=false
```

Explica que:

- Cada secreto debe ser distinto.
- Los secretos deben generarse con `openssl rand -hex 32`.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe permanecer en el backend.
- MongoDB no debe usar `localhost` en Cloud Run.
- `CORS_ORIGINS` debe coincidir exactamente con el dominio del frontend.
- No se debe añadir una barra final a las URLs salvo que el código la requiera.

## Fase 5: Vercel y frontend

Busca dónde se configura `VITE_API_URL` y explica cómo debe quedar:

```dotenv
VITE_API_URL=https://api.MI_DOMINIO.com/api
VITE_SUPABASE_URL=https://MI_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=MI_ANON_KEY
```

Comprueba si las peticiones que dependen de cookies utilizan:

```javascript
credentials: 'include'
```

Si no lo utilizan donde sea necesario, indícalo y propón el cambio mínimo. No modifiques código sin explicar antes qué archivo cambiarás y por qué.

Recuerda que las variables `VITE_*` se incorporan durante la compilación del frontend, por lo que después de cambiarlas hay que volver a desplegar en Vercel.

## Fase 6: procedimiento de despliegue

Escribe una guía paso a paso, en español, con comandos exactos, para:

1. Entrar en `lectura-activa/apps/edge`.
2. Instalar dependencias.
3. Iniciar sesión con Wrangler.
4. Comprobar la cuenta con `npx wrangler whoami`.
5. Guardar el secreto con `npx wrangler secret put ORIGIN_SHARED_SECRET`.
6. Desplegar con `npx wrangler deploy`.
7. Configurar el dominio `api.MI_DOMINIO.com`.
8. Configurar Cloud Run.
9. Configurar Vercel.
10. Probar `/health` y `/ready` directamente en Cloud Run.
11. Probar un endpoint `/api/...` a través del Worker.
12. Probar el frontend y el login.

No indiques que `/api/health` existe a menos que compruebes que el backend realmente registra esa ruta. En el código actual, el health check conocido es `/health`.

## Fase 7: activación de REQUIRE_EDGE

Explica que primero debe mantenerse:

```dotenv
REQUIRE_EDGE=false
```

Después de comprobar todo, explica cómo cambiarlo a:

```dotenv
REQUIRE_EDGE=true
```

Antes de recomendar ese cambio, verifica que:

- El secreto de Cloud Run coincide con el secreto del Worker.
- El Worker está desplegado.
- El dominio personalizado funciona.
- El frontend usa el dominio del Worker.
- El login funciona.
- Las cookies funcionan.
- Las peticiones directas protegidas a Cloud Run se rechazan con `403`.

Explica también que `/health`, `/ready` y las rutas internas de autenticación que el código marque como exentas pueden seguir siendo accesibles directamente.

## Fase 8: validación y diagnóstico

Incluye una tabla con estos problemas:

| Problema | Posible causa | Qué revisar |
|---|---|---|
| `EDGE_NOT_CONFIGURED` | Falta una variable en el Worker | `ORIGIN_URL` y `ORIGIN_SHARED_SECRET` |
| `403 Acceso directo no permitido` | El secreto no coincide o la petición no pasa por el Worker | Secretos, dominio y despliegue |
| `ORIGIN_UNREACHABLE` | Cloud Run no es accesible o la URL es incorrecta | `ORIGIN_URL`, estado de Cloud Run y acceso |
| Error CORS | El origen del frontend no está permitido | `CORS_ORIGINS` y URL real del frontend |
| Login sin sesión | No se envían cookies | `credentials: 'include'`, HTTPS y CORS |
| Worker devuelve `404` | La ruta no comienza por `/api/` | URL usada por el frontend |
| `/ready` devuelve `503` | MongoDB no responde | `MONGODB_URI`, red y credenciales |

## Formato de respuesta obligatorio

Responde siempre en este orden:

1. **Resumen del estado actual.**
2. **Cambios propuestos.**
3. **Cambios realizados**, únicamente si realmente modificaste archivos.
4. **Configuración manual en Cloudflare.**
5. **Configuración manual en Cloud Run.**
6. **Configuración manual en Vercel.**
7. **Pruebas que debo ejecutar.**
8. **Errores frecuentes y soluciones.**
9. **Lista de comprobación final.**

Cuando muestres contenido de archivos, indica siempre la ruta del archivo.

Cuando propongas un valor secreto, utiliza únicamente placeholders. Nunca inventes ni escribas secretos reales.

Si necesitas que yo te proporcione datos, pídeme únicamente estos valores no sensibles:

- Dominio principal.
- Subdominio elegido para la API.
- URL pública de Cloud Run.
- URL pública de Vercel.

Nunca me pidas que pegue en el chat:

- `SUPABASE_SERVICE_ROLE_KEY`.
- `COOKIE_SECRET`.
- `INTERNAL_HOOK_SECRET`.
- `ANALYTICS_JOB_SECRET`.
- `ORIGIN_SHARED_SECRET`.
- Contraseñas de MongoDB.
- Tokens de Cloudflare.

## Criterio de finalización

Considera que la tarea está correctamente preparada únicamente cuando:

- El Worker no contiene secretos en archivos versionados.
- `ORIGIN_URL` está claramente identificado como valor que debo sustituir.
- Cloud Run tiene instrucciones para configurar `ORIGIN_SHARED_SECRET`.
- Cloud Run tiene instrucciones para empezar con `REQUIRE_EDGE=false`.
- Existe una secuencia clara de pruebas antes de activar `REQUIRE_EDGE=true`.
- Vercel está configurado para utilizar `https://api.MI_DOMINIO.com/api`.
- Se explica cómo comprobar cookies y CORS.
- Se explica cómo revertir temporalmente a `REQUIRE_EDGE=false` si el Worker falla.
- No se han expuesto secretos.
