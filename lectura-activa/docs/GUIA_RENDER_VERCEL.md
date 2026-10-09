# Guía para configurar Render y Vercel

Este documento corresponde a las tareas de despliegue del frontend y la API.
No contiene credenciales reales. Los valores secretos deben configurarse
únicamente en los paneles de Render y Vercel.

## 1. Configurar la API en Render

### 1.1 Crear o revisar el servicio

1. Entrar a Render y abrir el proyecto correcto.
2. Crear un **Web Service** conectado al repositorio.
3. Seleccionar la rama que contiene los cambios que se van a desplegar.
4. Usar estos valores:

| Configuración | Valor |
|---|---|
| Root Directory | `lectura-activa/apps/api` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Usar Node.js 22 o la versión LTS configurada por el equipo. No colocar
credenciales en el repositorio, en el `Dockerfile` ni en los comandos de build.

### 1.2 Variables de entorno de Render

Configurar en **Environment > Environment Variables**:

```text
NODE_ENV=production
HOST=0.0.0.0
LOG_LEVEL=info
PORT=<puerto proporcionado por Render, si Render lo requiere>

MONGODB_URI=<URI de MongoDB Atlas>
MONGODB_DB=lectura_activa

SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<clave anon>
SUPABASE_SERVICE_ROLE_KEY=<clave service role>

COOKIE_SECRET=<valor seguro de al menos 32 caracteres>
INTERNAL_HOOK_SECRET=<valor seguro de al menos 32 caracteres>
ANALYTICS_JOB_SECRET=<valor seguro de al menos 32 caracteres>

FRONTEND_URL=https://<dominio-final-de-vercel>
CORS_ORIGINS=https://<dominio-final-de-vercel>
REQUIRE_EDGE=false

MAILER_MODE=resend
RESEND_API_KEY=<clave de Resend>
MAILER_FROM=<correo de un dominio verificado>
RESET_TOKEN_TTL_MINUTES=15
```

`SUPABASE_SERVICE_ROLE_KEY`, `COOKIE_SECRET`, `INTERNAL_HOOK_SECRET`,
`ANALYTICS_JOB_SECRET`, `RESEND_API_KEY` y `MONGODB_URI` son secretos de
servidor. Nunca deben configurarse como variables `VITE_*` ni enviarse a
Vercel.

Si se permiten varios dominios de frontend, separar los orígenes con comas:

```text
CORS_ORIGINS=https://<dominio-vercel>,https://<dominio-personalizado>
```

### 1.3 Desplegar y comprobar la API

1. Guardar las variables.
2. Ejecutar un nuevo deploy.
3. Esperar a que termine correctamente.
4. Abrir:

```text
https://<dominio-de-render>/health
https://<dominio-de-render>/ready
```

`/health` debe responder con `status: "ok"`. `/ready` debe confirmar que la
conexión a MongoDB está disponible.

Si el servicio no arranca, revisar los logs de Render sin copiar valores de
variables al chat o a capturas públicas.

## 2. Configurar el frontend en Vercel

### 2.1 Crear o revisar el proyecto

1. Entrar a Vercel y abrir el proyecto correcto.
2. Conectar el mismo repositorio.
3. Seleccionar la rama que se va a desplegar.
4. Configurar:

| Configuración | Valor |
|---|---|
| Root Directory | `lectura-activa/apps/web` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Si Vercel detecta Vite automáticamente, conservar la configuración equivalente.

### 2.2 Variables de entorno de Vercel

Revisar primero los usos de `import.meta.env` dentro de
`lectura-activa/apps/web/src`. Configurar solamente las variables públicas que
realmente utiliza el frontend, por ejemplo:

```text
VITE_API_URL=/api/v1
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave anon>
```

`VITE_API_URL` debe ser la ruta relativa `/api/v1`, no la URL directa de Render.
Así el navegador llama al mismo origen de Vercel y la regla de `vercel.json`
reenviará `/api/*` a Render. Si se usa directamente el dominio `onrender.com`,
la petición es cross-site y el navegador no enviará las cookies `SameSite=Lax`
de la sesión.

No configurar en Vercel:

```text
MONGODB_URI
SUPABASE_SERVICE_ROLE_KEY
COOKIE_SECRET
INTERNAL_HOOK_SECRET
ANALYTICS_JOB_SECRET
RESEND_API_KEY
```

Las variables del frontend deben tener el prefijo `VITE_` únicamente cuando el
código las lea con `import.meta.env`.

### 2.3 Desplegar y comprobar el frontend

1. Guardar las variables.
2. Crear un nuevo deployment.
3. Abrir la URL de Vercel.
4. Probar carga de páginas, login y llamadas a la API.
5. Revisar la consola del navegador para detectar errores de CORS o URLs
   incorrectas.

## 3. Coordinación entre Render y Vercel

El orden recomendado es:

1. Desplegar la API en Render.
2. Obtener la URL pública de Render.
3. Confirmar que el rewrite de `apps/web/vercel.json` apunta a esa URL y
   configurar `VITE_API_URL=/api/v1` en Vercel.
4. Desplegar el frontend en Vercel.
5. Obtener la URL final de Vercel.
6. Actualizar en Render `FRONTEND_URL` y `CORS_ORIGINS`.
7. Volver a desplegar Render.
8. Probar login, logout, registro y recuperación de contraseña.

No usar `*` en `CORS_ORIGINS` en producción cuando se utilizan cookies.

## 4. Datos que debe entregar el compañero

Al finalizar, compartir únicamente estos datos no sensibles:

- URL pública de Render.
- URL pública de Vercel.
- Confirmación de que `/health` responde correctamente.
- Confirmación de que `/ready` conecta con Atlas.
- Confirmación de que el frontend puede comunicarse con la API.
- Errores de despliegue, si existen, sin incluir secretos.

No compartir claves, contraseñas, URI completas de MongoDB ni valores de
variables privadas.
