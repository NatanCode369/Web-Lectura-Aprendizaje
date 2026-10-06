# Guía de despliegue para Lectura Activa

Este documento explica los pasos necesarios para dejar la app lista para desplegar en Vercel y en Google Cloud Run, sin incluir el punto de implementación del cliente API del frontend.

## 1. Revisión de la rama correcta

### Objetivo
Asegurarte de que la app web esté apuntando a la raíz correcta y con la configuración de SPA adecuada para Vercel.

### Pasos
1. Revisa la rama que vas a desplegar:
   - `main` o `develop`
2. Confirma que el proyecto raíz es:
   - `lectura-activa/apps/web`
3. Verifica que exista el archivo `index.html` dentro de esa carpeta.
4. Verifica que el proyecto esté configurado como SPA.
5. Asegúrate de tener un `vercel.json` con esto:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Importante
Si el `index.html` todavía redirige con `meta refresh` a una ruta como:

```html
<meta http-equiv="refresh" content="0; url=/src/pages/auth/login.html" />
```

eso generará 404 en Vercel. Debe reemplazarse por un `div#app` + carga del `main.js`.

Ejemplo correcto:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lectura Activa</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

---

## 2. Variables de entorno para Vercel (frontend)

### Objetivo
Configurar la web para hablar con la API desplegada en Cloud Run y con Supabase.

### Variables requeridas
En el panel de Vercel > Project > Settings > Environment Variables, añade:

```bash
VITE_API_URL=https://tu-api-url.a.run.app
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Recomendaciones
- Usa `VITE_API_URL` como la URL base de la API.
- Si la API está protegida por cookies HttpOnly, asegúrate de que tu frontend use `credentials: 'include'` en las peticiones fetch.
- El valor `VITE_API_URL` puede apuntar a una ruta de proxy si usas Cloudflare o un dominio propio.

### Validación
Haz una prueba rápida desde el navegador:

```bash
https://tu-app.vercel.app
```

Y revisa si la app carga sin errores de 404 en la raíz.

---

## 3. Variables de entorno para Cloud Run (backend)

### Objetivo
Dejar la API lista para producción con MongoDB, Supabase, cookies y CORS configurados.

### Variables mínimas
Ejemplo:

```bash
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net
MONGODB_DB=lectura_activa

SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

INTERNAL_HOOK_SECRET=generar_con_openssl_rand_hex_32
COOKIE_SECRET=generar_con_openssl_rand_hex_32
ANALYTICS_JOB_SECRET=generar_con_openssl_rand_hex_32

FRONTEND_URL=https://tu-app.vercel.app
CORS_ORIGINS=https://tu-app.vercel.app

ORIGIN_SHARED_SECRET=si_usas_cloudflare_worker
REQUIRE_EDGE=false
```

### Generación de secretos
Ejecuta:

```bash
openssl rand -hex 32
```

Usa ese valor para:
- `COOKIE_SECRET`
- `INTERNAL_HOOK_SECRET`
- `ANALYTICS_JOB_SECRET`
- `ORIGIN_SHARED_SECRET` si aplica

### Recomendación adicional
En producción, **MongoDB** debe estar en un servicio externo (MongoDB Atlas u otro hosting) y no apuntar a `localhost`.

---

## 4. Deploy de la API en Cloud Run (ya no incluye código del frontend)

### Objetivo
Publicar la API en Google Cloud Run para que la web la consuma.

### Pasos recomendados
1. Entrar en Google Cloud Console.
2. Ir a Cloud Run.
3. Crear un servicio nuevo.
4. Seleccionar la imagen del contenedor o conectar con GitHub si usas despliegue automático.
5. Configurar:
   - Región: la más cercana a tus usuarios
   - Puerto: `8080`
   - CPU/memoria según demanda
   - Variables de entorno con los valores anteriores
6. Habilitar acceso público o restringirlo si es necesario.
7. Guardar y desplegar.

### Verificación
Lanza una petición a:

```bash
https://tu-api-url.a.run.app/health
```

Debe devolver algo como:

```json
{
  "status": "ok",
  "service": "lectura-activa-api",
  "timestamp": "..."
}
```

También puedes probar:

```bash
https://tu-api-url.a.run.app/ready
```

Si responde `200` o `ready`, la API está lista.

---

## 5. Configuración de Cloudflare (opcional)

### Objetivo
Usar Cloudflare como capa de protección o proxy frente a la API.

### Qué revisar
El backend ya tiene soporte para una validación de origen:

```javascript
ORIGIN_SHARED_SECRET
REQUIRE_EDGE
```

Esto significa que puedes proteger la API para que solo acepte tráfico proveniente de un Worker de Cloudflare.

### Recomendaciones
- Si no vas a usar Cloudflare, deja `REQUIRE_EDGE=false`.
- Si sí vas a usar Cloudflare, define un secreto compartido con el Worker y configúralo en Cloud Run.

### Verificación
- Asegúrate de que la API no rechace peticiones normales del frontend si `REQUIRE_EDGE=false`.
- Si `REQUIRE_EDGE=true`, todas las llamadas deben pasar por el Worker.

---

## 6. Buenas prácticas de despliegue

### Para Vercel
- El proyecto raíz debe ser `lectura-activa/apps/web`.
- Usar `npm run build`.
- Reescribir rutas a `index.html`.
- No usar redirecciones con `meta refresh` para la entrada principal.

### Para API en Cloud Run
- La app debe escuchar en `0.0.0.0` y `PORT`.
- El Dockerfile ya está preparado para Cloud Run.
- El backend usa Fastify con `trustProxy: true`, correcto para proxies.

### Para CORS
La API está configurada para aceptar una lista de orígenes en:

```bash
CORS_ORIGINS
```

Debe incluir la URL de tu frontend de Vercel.

---

## 7. Lista de verificación final

Antes de abrir la app, revisa esto:

- [ ] Vercel apunta a `lectura-activa/apps/web`
- [ ] Existe `vercel.json`
- [ ] `index.html` no tiene redirección de SPA a ruta física
- [ ] `VITE_API_URL` está definido
- [ ] `VITE_SUPABASE_URL` está definido
- [ ] `VITE_SUPABASE_ANON_KEY` está definido
- [ ] Cloud Run está desplegado y responde en `/health`
- [ ] `CORS_ORIGINS` incluye el dominio de Vercel
- [ ] MongoDB está disponible en producción
- [ ] Supabase está configurado con credenciales válidas
- [ ] Secretos generados y no vacíos

---

## 8. Siguientes pasos recomendados

1. Dejar la web desplegada en Vercel.
2. Dejar la API desplegada en Cloud Run.
3. Probar `/health`, `/ready`, y un login real.
4. Si se usan cookies HttpOnly, validar que el navegador envía la cookie en la llamada del frontend.
5. Si usas Cloudflare, validar que el Worker y la API compartan el mismo secreto.

Este documento evita el punto 4 del despliegue del cliente API del frontend para que quede separado y más claro.
