# Guía de despliegue para Lectura Activa

Este documento explica dos opciones para desplegar la app:
1. **100% en Vercel** (recomendado para inicios rápidos)
2. **Vercel + Cloud Run** (recomendado para producción escalable)

---

# OPCIÓN 1: Despliegue 100% en Vercel (Recomendado para inicios)

## Ventajas
- ✅ Una sola plataforma
- ✅ Despliegues automáticos desde GitHub
- ✅ Más simple de configurar
- ✅ No requiere Google Cloud
- ✅ Ideal para MVP y pruebas

## Limitaciones
- Vercel Functions tiene límite de ~10-15s de ejecución (plan gratuito)
- Mejor para APIs ligeras y rápidas
- Si tu API hace operaciones muy pesadas o colas de tareas, considera Cloud Run

---

## Paso 1: Estructura del proyecto en Vercel

Tu proyecto debe verse así:

```
lectura-activa/
├── apps/
│   └── web/              # Frontend React/Vue
│       ├── src/
│       ├── package.json
│       └── vercel.json
└── api/                  # Backend (NUEVO - Vercel Functions)
    ├── package.json
    └── index.js          # O puedes crear rutas en api/routes/
```

## Paso 2: Convertir tu API a Vercel Functions

Si tu API está en Fastify, crea un archivo `api/index.js`:

```javascript
// api/index.js
import Fastify from 'fastify';

const app = Fastify();

// Tus rutas aquí
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'lectura-activa-api' };
});

app.post('/login', async (request, reply) => {
  // Tu lógica de login
});

// Exportar para Vercel
export default app;
```

O si prefieres usar **Vercel Serverless Functions** (recomendado):

```javascript
// api/health.js
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', service: 'lectura-activa-api' });
}

// api/login.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  // Tu lógica de login
}
```

Cada archivo en `api/` se convierte automáticamente en un endpoint:
- `api/health.js` → `https://tu-app.vercel.app/api/health`
- `api/login.js` → `https://tu-app.vercel.app/api/login`

## Paso 3: Configurar `vercel.json`

En la raíz del proyecto, crea o actualiza `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "NODE_ENV": "production",
    "MONGODB_URI": "@mongodb_uri",
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "COOKIE_SECRET": "@cookie_secret"
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Paso 4: Variables de entorno en Vercel Dashboard

En **Vercel > Project > Settings > Environment Variables**, define:

```
VITE_API_URL=https://tu-app.vercel.app/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net
MONGODB_DB=lectura_activa
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
COOKIE_SECRET=generar_con_openssl_rand_hex_32
INTERNAL_HOOK_SECRET=generar_con_openssl_rand_hex_32
ANALYTICS_JOB_SECRET=generar_con_openssl_rand_hex_32
```

## Paso 5: Actualizar frontend para usar la API local

En tu frontend, cambia `VITE_API_URL`:

```javascript
// .env.production
VITE_API_URL=https://tu-app.vercel.app/api
```

En lugar de apuntar a Cloud Run.

## Paso 6: Deploy automático

1. Conecta tu repo a Vercel
2. Vercel detectará automáticamente:
   - `apps/web` como frontend
   - `api/` como funciones serverless
3. Cada push a `main` desplegará ambos

## Paso 7: Validación

```bash
# Frontend
https://tu-app.vercel.app

# API
https://tu-app.vercel.app/api/health
```

---

# OPCIÓN 2: Despliegue Vercel + Cloud Run (Recomendado para producción)

## Cuándo usar esta opción
- ✅ Aplicaciones con alto tráfico
- ✅ APIs que hacen operaciones pesadas o largas
- ✅ Necesitas colas de tareas o procesamiento asincrónico
- ✅ Quieres separar completamente frontend y backend

## Diferencias clave
- Frontend en Vercel (más rápido)
- API en Cloud Run (más escalable)
- No necesitas `api/` en tu repo

---

## Revisión de la rama correcta

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

## Variables de entorno para Vercel (frontend)

### Objetivo
Configurar la web para hablar con la API desplegada.

### Variables requeridas (OPCIÓN 1: API en Vercel)
En el panel de Vercel > Project > Settings > Environment Variables, añade:

```bash
VITE_API_URL=https://tu-app.vercel.app/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Variables requeridas (OPCIÓN 2: API en Cloud Run)
```bash
VITE_API_URL=https://tu-api-url.a.run.app
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Recomendaciones
- Usa `VITE_API_URL` como la URL base de la API.
- Si la API está protegida por cookies HttpOnly, asegúrate de que tu frontend use `credentials: 'include'` en las peticiones fetch.
- Verifica que CORS esté bien configurado en el backend.

### Validación
Haz una prueba rápida desde el navegador:

```bash
https://tu-app.vercel.app
```

Y revisa si la app carga sin errores de 404 en la raíz.

---

## Variables de entorno para Cloud Run (backend) - SOLO OPCIÓN 2

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

## Deploy de la API en Cloud Run - SOLO OPCIÓN 2

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

## Configuración de Cloudflare (opcional - SOLO OPCIÓN 2)

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

## Buenas prácticas de despliegue

### Para Vercel (ambas opciones)
- El proyecto raíz debe ser `lectura-activa/apps/web`.
- Usar `npm run build`.
- Reescribir rutas a `index.html`.
- No usar redirecciones con `meta refresh` para la entrada principal.

### Para API en Vercel Functions (OPCIÓN 1)
- Cada archivo en `api/` se convierte en un endpoint serverless
- Limite de ejecución: ~10-15s (gratuito), hasta 60s (Pro)
- Ideal para APIs ligeras y rápidas
- Sin estado persistente entre llamadas

### Para API en Cloud Run (OPCIÓN 2)
- La app debe escuchar en `0.0.0.0` y `PORT`.
- El Dockerfile ya está preparado para Cloud Run.
- El backend usa Fastify con `trustProxy: true`, correcto para proxies.
- Mejor para workloads pesados y escalables

### Para CORS
La API está configurada para aceptar una lista de orígenes en:

```bash
CORS_ORIGINS
```

Debe incluir la URL de tu frontend de Vercel.

---

## Lista de verificación final - OPCIÓN 1 (Vercel)

Antes de abrir la app, revisa esto:

- [ ] Repo conectado a Vercel
- [ ] Vercel detecta `apps/web` como frontend
- [ ] Vercel detecta `api/` como Vercel Functions
- [ ] Existe `vercel.json`
- [ ] `index.html` no tiene redirección de SPA a ruta física
- [ ] `VITE_API_URL=https://tu-app.vercel.app/api`
- [ ] `VITE_SUPABASE_URL` está definido
- [ ] `VITE_SUPABASE_ANON_KEY` está definido
- [ ] Variables de entorno backend en Vercel Dashboard
- [ ] MongoDB está disponible en producción
- [ ] Supabase está configurado con credenciales válidas
- [ ] Secretos generados y no vacíos
- [ ] `https://tu-app.vercel.app/api/health` responde correctamente

---

## Lista de verificación final - OPCIÓN 2 (Vercel + Cloud Run)

Antes de abrir la app, revisa esto:

- [ ] Vercel apunta a `lectura-activa/apps/web`
- [ ] Existe `vercel.json`
- [ ] `index.html` no tiene redirección de SPA a ruta física
- [ ] `VITE_API_URL=https://tu-api-url.a.run.app`
- [ ] `VITE_SUPABASE_URL` está definido
- [ ] `VITE_SUPABASE_ANON_KEY` está definido
- [ ] Cloud Run está desplegado y responde en `/health`
- [ ] `CORS_ORIGINS` incluye el dominio de Vercel
- [ ] MongoDB está disponible en producción
- [ ] Supabase está configurado con credenciales válidas
- [ ] Secretos generados y no vacíos

---

## Siguientes pasos recomendados

### Si eliges OPCIÓN 1 (Vercel)
1. Crear carpeta `api/` en la raíz del repo
2. Migrar endpoints a Vercel Functions
3. Conectar repo a Vercel
4. Configurar variables de entorno
5. Deploy automático en cada push a `main`
6. Probar `/api/health` y un login real

### Si eliges OPCIÓN 2 (Vercel + Cloud Run)
1. Dejar la web desplegada en Vercel
2. Dejar la API desplegada en Cloud Run
3. Probar `/health`, `/ready`, y un login real
4. Si se usan cookies HttpOnly, validar que el navegador envía la cookie en la llamada del frontend
5. Si usas Cloudflare, validar que el Worker y la API compartan el mismo secreto

---

## Resumen de decisión

| Criterio | OPCIÓN 1 (Vercel) | OPCIÓN 2 (Cloud Run) |
|----------|------------------|---------------------|
| Simplicidad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Costo | ⭐⭐⭐⭐⭐ (gratuito) | ⭐⭐ (pago) |
| Escalabilidad | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| APIs ligeras | ✅ Óptimo | ✅ Funciona |
| APIs pesadas | ❌ No recomendado | ✅ Recomendado |
| Primeros pasos | ✅ Rápido | ⏱️ Más tiempo |
| Producción | ⚠️ Con límites | ✅ Full production |

**Recomendación**: Comienza con OPCIÓN 1 para MVP rápido. Migra a OPCIÓN 2 cuando necesites mayor escala.
