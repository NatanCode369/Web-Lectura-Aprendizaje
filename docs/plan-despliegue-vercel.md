# Plan detallado para desplegar Lectura Activa en Vercel

## 1. Objetivo

La arquitectura objetivo será:

```text
Frontend en Vercel
        |
        v
API como función de Vercel
        |
        +--> MongoDB Atlas
        +--> Supabase
```

Esta opción reemplaza, para esta fase, el plan anterior basado en Cloud Run y Cloudflare.

No se deben utilizar en esta arquitectura:

- Google Cloud Run.
- Cloudflare Workers.
- `ORIGIN_SHARED_SECRET`.
- `REQUIRE_EDGE=true`.
- `x-origin-secret`.
- `x-client-ip`.

Los archivos de Cloudflare no se deben borrar automáticamente. Primero se debe comprobar que la alternativa de Vercel funciona correctamente.

## 2. Estado actual confirmado

### Frontend

El frontend se encuentra en:

```text
lectura-activa/apps/web/
```

Tiene:

- `package.json`.
- `vite.config.js`.
- `vercel.json`.
- `index.html`.
- `src/main.js`.
- `src/pages/auth/login.js`.
- `src/services/apiClient.js`.
- `src/services/authService.js`.

La página principal ya muestra el formulario original de inicio de sesión.

El cliente HTTP utiliza:

```javascript
credentials: 'include'
```

Esto es necesario para enviar y recibir cookies de sesión.

### Backend

El backend se encuentra en:

```text
lectura-activa/apps/api/
```

Está construido con Fastify y actualmente se inicia como un servidor tradicional mediante:

```javascript
fastify.listen(...)
```

Las rutas principales están registradas bajo:

```text
/api/v1/...
```

Rutas de autenticación confirmadas:

```text
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
```

También existen:

```text
GET /health
GET /ready
```

### Problema actual del login

El archivo:

```text
lectura-activa/apps/web/src/pages/auth/login.js
```

todavía utiliza una redirección temporal. No llama realmente al backend.

La lógica actual decide si el usuario es docente o estudiante según el texto del correo. Esa lógica no debe permanecer en producción.

El login real debe utilizar:

```text
lectura-activa/apps/web/src/services/authService.js
```

y enviar la petición a:

```text
POST /api/v1/auth/login
```

## 3. Regla de seguridad para los cambios

La adaptación del backend a Vercel puede afectar varias partes del proyecto. Por eso se debe trabajar en dos pasos:

### Paso A: inspección y propuesta

Antes de modificar el backend se deben revisar:

```text
lectura-activa/apps/api/src/server.js
lectura-activa/apps/api/src/config/env.js
lectura-activa/apps/api/src/shared/db.js
lectura-activa/apps/api/src/modules/auth/auth.routes.js
lectura-activa/apps/api/src/shared/auth.js
lectura-activa/apps/web/src/services/apiClient.js
lectura-activa/apps/web/src/services/authService.js
lectura-activa/apps/web/src/pages/auth/login.js
lectura-activa/apps/web/vercel.json
lectura-activa/apps/web/package.json
```

Después se debe mostrar:

- Qué archivos se modificarán.
- Qué archivos nuevos se crearán.
- Qué comportamiento conservará cada archivo.
- Qué riesgos existen.
- Qué pruebas se ejecutarán.

### Paso B: aplicación autorizada

Solo después de confirmar la propuesta se deben modificar los archivos.

No se deben cambiar simultáneamente el backend completo, las rutas del frontend y la configuración de Vercel sin pruebas intermedias.

## 4. Fase 1: preparar una función de Vercel para Fastify

### Objetivo

Permitir que el backend responda como función serverless sin abrir un puerto mediante `fastify.listen()`.

### Requisitos

La función debe:

1. Importar o reutilizar `buildServer()`.
2. No ejecutar `start()`.
3. No llamar a `fastify.listen()`.
4. Recibir solicitudes HTTP de Vercel.
5. Pasarlas a Fastify.
6. Devolver la respuesta de Fastify a Vercel.
7. Conservar:
   - Método HTTP.
   - Query string.
   - Headers.
   - Body.
   - Cookies.
   - Archivos multipart cuando sean compatibles con los límites de Vercel.
8. Reutilizar la instancia de Fastify cuando Vercel mantenga caliente la función.
9. Manejar correctamente los errores.
10. No ocultar errores de inicialización.

### Restricciones

No se debe copiar `server.js` directamente dentro de una función sin revisar su comportamiento, porque podría:

- Abrir un puerto innecesario.
- Crear conexiones repetidas.
- No devolver la respuesta correctamente.
- Provocar errores de inicialización.

## 5. Fase 2: decidir la raíz del proyecto en Vercel

Se debe elegir una estructura que permita desplegar frontend y API desde el mismo proyecto.

La opción preferida es un único proyecto Vercel, porque facilita:

- Cookies.
- Rutas relativas.
- Menos problemas de CORS.
- Una sola URL pública.
- Uso de:

  ```text
  /api/v1/...
  ```

### Punto que debe verificarse

El frontend está dentro de:

```text
lectura-activa/apps/web
```

La función backend está dentro de:

```text
lectura-activa/apps/api
```

Vercel debe configurarse para reconocer ambos componentes. No se debe asumir que seleccionar solamente `apps/web` hará que Vercel encuentre automáticamente la API.

Antes de modificar `vercel.json`, se debe comprobar la estrategia exacta de raíz, build y funciones.

## 6. Fase 3: conservar las rutas actuales

No se deben cambiar las rutas del backend solamente para adaptarlas a Vercel.

Las rutas esperadas son:

```text
/api/v1/auth/login
/api/v1/auth/register
/api/v1/auth/logout
/api/v1/auth/forgot-password
/api/v1/readings
/api/v1/groups
/api/v1/assignments
/api/v1/student-assignments
/api/v1/attempts
/api/v1/analytics
```

El frontend debe construir las rutas de esta forma:

```text
VITE_API_URL=/api/v1
```

Por ejemplo:

```text
/api/v1 + /auth/login
= /api/v1/auth/login
```

## 7. Fase 4: conectar el login real

Archivo a revisar:

```text
lectura-activa/apps/web/src/pages/auth/login.js
```

El cambio esperado será:

1. Importar `login` desde `authService.js`.
2. Mantener las validaciones del formulario.
3. Enviar correo y contraseña al backend.
4. Mostrar un error claro si el backend rechaza el login.
5. Utilizar el usuario devuelto por el backend.
6. Redirigir según el rol real del usuario.
7. No decidir el rol por el texto del correo.
8. No guardar tokens en `localStorage`.
9. Conservar el uso de cookies HttpOnly.
10. Evitar redirecciones antes de que termine la respuesta.

El flujo esperado será:

```text
Usuario completa formulario
        ↓
Validación local
        ↓
POST /api/v1/auth/login
        ↓
Backend valida credenciales
        ↓
Backend crea cookies HttpOnly
        ↓
Frontend recibe usuario seguro
        ↓
Frontend redirige según el rol real
```

## 8. Fase 5: variables de entorno

### Variables públicas del frontend

Estas variables pueden terminar incluidas en el JavaScript del navegador:

```dotenv
VITE_API_URL=/api/v1
VITE_SUPABASE_URL=https://MI_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=MI_ANON_KEY
```

No se deben poner secretos privados con el prefijo `VITE_`.

### Variables privadas del backend

Estas variables deben configurarse en Vercel como variables de servidor:

```dotenv
NODE_ENV=production
LOG_LEVEL=info
MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@CLUSTER.mongodb.net
MONGODB_DB=lectura_activa
SUPABASE_URL=https://MI_PROYECTO.supabase.co
SUPABASE_ANON_KEY=MI_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=MI_SERVICE_ROLE_KEY
COOKIE_SECRET=SECRETO_GENERADO_1
INTERNAL_HOOK_SECRET=SECRETO_GENERADO_2
ANALYTICS_JOB_SECRET=SECRETO_GENERADO_3
FRONTEND_URL=https://web-lectura-aprendizaje.vercel.app
CORS_ORIGINS=https://web-lectura-aprendizaje.vercel.app
```

No se deben escribir secretos reales en este documento ni en archivos versionados.

### Variables que no corresponden a esta arquitectura

No se deben configurar para la nueva arquitectura:

```dotenv
ORIGIN_SHARED_SECRET
REQUIRE_EDGE=true
```

Si el código las acepta opcionalmente, se debe verificar que su ausencia no impida iniciar el backend con `NODE_ENV=production`.

## 9. Fase 6: MongoDB Atlas

MongoDB Atlas seguirá siendo la base de datos del backend.

La URI de producción debe utilizar un servicio remoto:

```dotenv
MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@CLUSTER.mongodb.net
```

No se debe utilizar:

```text
mongodb://localhost:27017
```

Pasos:

1. Confirmar que existe el cluster de MongoDB Atlas.
2. Confirmar que existe un usuario de base de datos.
3. Confirmar que el usuario tiene acceso a `lectura_activa`.
4. Revisar **Network Access**.
5. Configurar el acceso necesario para Vercel según la documentación vigente de MongoDB Atlas.
6. No publicar la contraseña.
7. Probar `/ready` después del despliegue.

## 10. Fase 7: Supabase

Configurar en Vercel:

```dotenv
SUPABASE_URL=https://MI_PROYECTO.supabase.co
SUPABASE_ANON_KEY=MI_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=MI_SERVICE_ROLE_KEY
```

Reglas:

- `SUPABASE_ANON_KEY` puede utilizarse en el frontend.
- `SUPABASE_SERVICE_ROLE_KEY` solo puede existir en el backend.
- Nunca crear `VITE_SUPABASE_SERVICE_ROLE_KEY`.
- Nunca escribir la service role key en HTML, JavaScript del frontend o documentación versionada.

## 11. Fase 8: configuración de Vercel

En el proyecto de Vercel:

1. Importar el repositorio correcto.
2. Configurar la raíz que incluya frontend y API.
3. Configurar el comando de build real.
4. Configurar el directorio de salida del frontend.
5. Configurar las funciones backend.
6. Añadir las variables públicas y privadas en **Settings > Environment Variables**.
7. Usar los entornos correctos:
   - Preview.
   - Production.
8. Desplegar.
9. Revisar los logs.

Después de cambiar cualquier variable `VITE_*`, se debe crear un nuevo despliegue porque esas variables se incorporan durante el build.

## 12. Fase 9: pruebas locales

### Build del frontend

Desde:

```text
lectura-activa/apps/web
```

Ejecutar:

```bash
npm install
npm run build
```

Resultado esperado:

- El comando termina sin errores.
- Se genera `dist/`.
- Se genera el CSS final.
- Se genera el JavaScript final.
- Se incluyen las imágenes necesarias.

### Validación del adaptador backend

Antes del despliegue se debe comprobar:

- La función se puede importar.
- No se ejecuta `fastify.listen()`.
- No se abre un puerto.
- Fastify responde a una solicitud de prueba.
- La configuración de entorno se valida.
- Los errores se muestran claramente.

### Pruebas existentes

Ejecutar las pruebas del backend desde:

```text
lectura-activa/apps/api
```

```bash
npm test
```

Los fallos preexistentes deben distinguirse de los fallos causados por el adaptador de Vercel.

## 13. Fase 10: pruebas después del despliegue

### Prueba 1: página principal

Abrir:

```text
https://web-lectura-aprendizaje.vercel.app/
```

Debe aparecer el formulario original de login.

No debe aparecer:

```text
Frontend de Lectura Activa
```

### Prueba 2: health check

Abrir:

```text
https://web-lectura-aprendizaje.vercel.app/health
```

Debe responder con estado `200` y un JSON similar a:

```json
{
  "status": "ok",
  "service": "lectura-activa-api"
}
```

### Prueba 3: conexión con la base de datos

Abrir:

```text
https://web-lectura-aprendizaje.vercel.app/ready
```

Debe devolver una respuesta exitosa con `db: true`.

Si devuelve `503`, revisar:

- `MONGODB_URI`.
- Usuario y contraseña.
- Network Access de MongoDB Atlas.
- Estado del cluster.

### Prueba 4: registro

1. Abrir el formulario de registro.
2. Registrar un usuario de prueba.
3. Revisar la pestaña **Network**.
4. Confirmar que se utiliza:

   ```text
   POST /api/v1/auth/register
   ```

5. Confirmar la respuesta del backend.

### Prueba 5: login correcto

1. Introducir credenciales válidas.
2. Confirmar que se envía:

   ```text
   POST /api/v1/auth/login
   ```

3. Confirmar respuesta `2xx`.
4. Confirmar que el backend envía cookies.
5. Confirmar redirección según el rol real.

### Prueba 6: login incorrecto

Usar una contraseña incorrecta.

Debe ocurrir lo siguiente:

- El backend rechaza la solicitud.
- El frontend muestra un mensaje.
- El usuario permanece en el login.
- No se produce una redirección falsa.

### Prueba 7: cookies

En las herramientas del navegador:

1. Abrir **Application** o **Storage**.
2. Entrar en **Cookies**.
3. Confirmar las cookies de sesión.
4. Confirmar `HttpOnly`.
5. Confirmar `Secure` en HTTPS.
6. Confirmar `Path=/`.

No se debe intentar leer una cookie HttpOnly desde JavaScript.

### Prueba 8: sesión

1. Iniciar sesión.
2. Recargar la página.
3. Abrir una página protegida.
4. Confirmar que la sesión continúa.
5. Cerrar sesión.
6. Confirmar que las cookies se eliminan.

### Prueba 9: CORS

Revisar la consola del navegador.

No debe aparecer:

```text
blocked by CORS policy
```

El origen configurado debe coincidir exactamente con:

```text
https://web-lectura-aprendizaje.vercel.app
```

## 14. Errores frecuentes

| Problema | Causa posible | Qué revisar |
|---|---|---|
| La página muestra el texto antiguo | Vercel no se redesplegó o hay caché | Deployment y `Ctrl + F5` |
| `404` en `/health` | La función no está publicada en esa ruta | `vercel.json`, ubicación de la función y logs |
| `Cannot find module` | Raíz o rutas de importación incorrectas | Estructura del proyecto y build |
| `Falta MONGODB_URI` | Variable no configurada en Vercel | Environment Variables |
| `/ready` devuelve `503` | MongoDB no responde | Atlas, URI y Network Access |
| Login devuelve `404` | La ruta `/api/v1/auth/login` no llega a Fastify | Rewrites y adaptador |
| Login devuelve `500` | Variables backend incompletas | Logs de Vercel y `env.js` |
| Login no conserva sesión | Cookies o credentials mal configurados | `credentials: 'include'`, HTTPS y headers |
| Error CORS | Origen diferente al configurado | `CORS_ORIGINS` y URL real |
| Secretos aparecen en el navegador | Se usó el prefijo `VITE_` | Variables públicas y build |
| La subida de PDF falla | Límite de funciones serverless | Multipart, tamaño y límites de Vercel |

## 15. Criterios de finalización

La migración se considera funcional únicamente cuando:

- La página principal muestra el login.
- El frontend compila.
- La función backend responde a `/health`.
- `/ready` confirma conexión con MongoDB.
- El registro funciona.
- El login real funciona.
- El login incorrecto muestra error.
- Las cookies son HttpOnly.
- La sesión se conserva al recargar.
- Logout elimina la sesión.
- No existen errores CORS.
- No hay secretos en el frontend.
- `SUPABASE_SERVICE_ROLE_KEY` solo está en backend.
- Las rutas `/api/v1/...` se conservan.
- Los logs de Vercel no muestran errores de inicialización.

## 16. Limpieza posterior opcional

Solo después de completar todas las pruebas se podrá decidir si se actualizan o eliminan referencias antiguas a Cloud Run y Cloudflare.

Posibles archivos de documentación a revisar:

```text
docs/despliegue-guia.md
docs/configuracion-cloudflare-copilot.md
lectura-activa/apps/edge/README.md
lectura-activa/apps/edge/wrangler.toml
```

No se deben eliminar archivos ni funcionalidad sin una revisión específica y autorización previa.

## 17. Resumen operativo

1. Revisar y autorizar la adaptación de Fastify.
2. Crear el adaptador para funciones de Vercel.
3. Configurar el proyecto Vercel para frontend y API.
4. Configurar variables privadas sin exponer secretos.
5. Conectar MongoDB Atlas.
6. Conectar Supabase.
7. Probar `/health`.
8. Probar `/ready`.
9. Conectar `login.js` con `authService.login()`.
10. Probar registro, login, cookies, sesión y logout.
11. Revisar logs y errores.
12. Actualizar documentación.
13. Considerar la limpieza de archivos antiguos únicamente al final.
