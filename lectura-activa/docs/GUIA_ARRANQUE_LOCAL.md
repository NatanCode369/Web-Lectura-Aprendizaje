# Guía de arranque local — Lectura Activa API

**Autor:** Diego (P2)
**Fecha:** 07 de Octubre, 2026
**Aplica a:** `apps/api/` en desarrollo local

Esta guía explica cómo arrancar la API en tu máquina con MongoDB Atlas + Supabase Auth. Sigue los pasos **en orden**.

---

## 1. Prerrequisitos

| Herramienta | Versión | Notas |
|---|---|---|
| **Node.js** | `22.19.0` o `22.21.1` | ⚠️ Evita Node 25 (tiene bug de DNS en Windows). Descargar de [nodejs.org/dist/v22.19.0](https://nodejs.org/dist/v22.19.0/) |
| **npm** | `≥ 10` | Viene con Node |
| **Git** | Reciente | Con acceso al repo `NatanCode369/Web-Lectura-Aprendizaje` |

### ⚠️ Sobre Windows

- **Node 25.x** tiene un bug conocido de DNS que **rompe la conexión a MongoDB Atlas**.
- **Node 22.19.0** es la versión recomendada para desarrollo en Windows.
- Si usas **WSL2 o Linux/Mac**, no hay problema con la versión (siempre que sea LTS).

---

## 2. Clonar el repo (primera vez)

```bash
git clone https://github.com/NatanCode369/Web-Lectura-Aprendizaje.git
cd Web-Lectura-Aprendizaje
git checkout develop
```

---

## 3. Crear el `.env` local

El archivo `.env` **no se sube al repo** (contiene secretos). Cada desarrollador tiene el suyo.

### 3.1 Copiar el ejemplo

```bash
cd lectura-activa/apps/api
cp .env.example .env
```

### 3.2 Rellenar los valores

Edita `apps/api/.env` con estos valores (pídele las credenciales a **P7** si no las tienes):

```bash
NODE_ENV=development
PORT=8080
HOST=0.0.0.0
LOG_LEVEL=info

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<usuario>:<password>@lectura-activa.frrbmmu.mongodb.net/lectura-activa?appName=lectura-activa
MONGODB_DB=lectura-activa

# Supabase Auth
SUPABASE_URL=https://kxlcrqtxdpnsqmrdzoxa.supabase.co
SUPABASE_ANON_KEY=<pedir a P7>
SUPABASE_SERVICE_ROLE_KEY=<pedir a P7>

# Hook de dominio
INTERNAL_HOOK_SECRET=dev-secret-0123456789abcdef0123456789abcdef

# Cookies
COOKIE_SECRET=dev-cookie-secret-change-me-32chars

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

# Edge (opcional)
REQUIRE_EDGE=false
```

**⚠️ Nunca subas el `.env` al repo.** Está en `.gitignore`.

---

## 4. Instalar dependencias

```bash
cd apps/api
npm install
```

**Nota:** si tu `npm install` intenta descargar `mongodb-memory-server` (600 MB), es porque alguien lo añadió al `package.json`. Avísale a P1/P7 para quitarlo.

---

## 5. Verificar conectividad

### 5.1 MongoDB Atlas

```bash
node -e "import('dotenv/config').then(async () => {
  const { MongoClient } = await import('mongodb');
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  await c.db('admin').command({ ping: 1 });
  console.log('✅ MongoDB OK');
  await c.close();
})"
```

**Esperado:** `✅ MongoDB OK`

### 5.2 Supabase Auth

```bash
node -e "import('dotenv/config').then(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { error } = await s.auth.getSession();
  if (error) throw error;
  console.log('✅ Supabase OK');
})"
```

**Esperado:** `✅ Supabase OK`

**Si falla:**
- **MongoDB**: verifica tu IP en [cloud.mongodb.com](https://cloud.mongodb.com) → Network Access → Add Current IP Address.
- **Supabase**: pídele a P7 que confirme las claves.

---

## 6. Aplicar migración y seed

```bash
cd apps/api

# 1. Crear colecciones + validadores + índices
node scripts/migrate.mjs

# 2. Insertar institución + 4 usuarios de prueba
node scripts/seed.mjs
```

**Esperado:**
```
✔ Colección creada: institutions
✔ Colección creada: users
✅ Migración completada.

✅ Seed completado.
  Institución: Colegio Demo Guatemala
  Usuarios: 4
```

**Si ya los ejecutaste antes**, puedes re-ejecutarlos sin problema (son idempotentes).

---

## 7. Arrancar el servidor

```bash
cd apps/api
node src/server.js
```

**Esperado:**
```
INFO: MongoDB conectado
    db: "lectura-activa"
INFO: ✅ API escuchando en http://0.0.0.0:8080
```

**⚠️ Si ves `WARN: Supabase no configurado todavía`**, revisa tu `.env`.

---

## 8. Probar los endpoints

**Abre OTRA terminal** (deja el servidor corriendo).

### 8.1 Health y ready

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

**Esperado:**
```json
{"status":"ok","service":"lectura-activa-api","timestamp":"..."}
{"status":"ready","db":true}
```

### 8.2 Validar dominio

```bash
curl -X POST http://localhost:8080/api/v1/auth/internal/validate-domain \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: dev-secret-0123456789abcdef0123456789abcdef" \
  -d '{"email":"estudiante1@colegiodemo.edu.gt"}'
```

**Esperado:**
```json
{"allowed":true,"institutionId":"..."}
```

### 8.3 Registrar usuario

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo@colegiodemo.edu.gt","password":"test12345","fullName":"Usuario Nuevo"}'
```

**Esperado:**
```json
{"user":{"id":"uuid-supabase","email":"nuevo@colegiodemo.edu.gt"}}
```

### 8.4 Login (crea cookies)

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"nuevo@colegiodemo.edu.gt","password":"test12345"}'
```

**Esperado:**
```json
{"user":{"_id":"...","email":"nuevo@colegiodemo.edu.gt","role":"student",...}}
```

### 8.5 Ver perfil con la cookie

```bash
curl http://localhost:8080/api/v1/me -b cookies.txt
```

**Esperado:** el mismo objeto user.

### 8.6 Logout

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout -c cookies.txt
```

**Esperado:**
```json
{"ok":true}
```

---

## 9. Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `querySrv ECONNREFUSED` | Bug de DNS en Node 25 (Windows) | Instalar Node **22.19.0** |
| `MongoServerSelectionError: timeout` | IP no autorizada en Atlas | Atlas → Network Access → Add Current IP |
| `WARN: Supabase no configurado` | Faltan claves en `.env` | Pedir a P7 y rellenar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `Not allowed by CORS` | Petición sin header `Origin` | Añadir `-H "Origin: http://localhost:5173"` en curl |
| `Cannot find package 'mongodb'` | Script ejecutado desde `database/` | Ejecutar desde `apps/api/` con `node scripts/migrate.mjs` |
| `INVALID_CREDENTIALS` en login | El email no está confirmado | Dev: cambiar `email_confirm: env.NODE_ENV !== 'production'` en `auth.service.js`. Prod: confirmar el email desde Supabase. |
| `dotenv` no carga | Falta `import 'dotenv/config'` | Verificar en `env.js` y `db.js` |

---

## 10. Flujo completo verificado

Una vez corriendo, esta secuencia funciona end-to-end:

1. `POST /api/v1/auth/register` → crea usuario en Supabase.
2. `POST /api/v1/auth/login` → valida en Supabase, hace lazy provisioning en Mongo, crea cookies HttpOnly.
3. `GET /api/v1/me` con la cookie → devuelve el usuario desde Mongo.
4. `POST /api/v1/auth/logout` → limpia cookies.

**Lazy provisioning:** si un usuario existe en Supabase pero **no en Mongo**, el primer `/login` crea el documento en `users` con `role: student` por defecto (ADR 0001).

---

## 11. Contacto

- **Dueño del módulo:** Diego (P2)
- **Infraestructura y credenciales:** P7
- **Revisión arquitectónica:** P1

**Cambios a este documento**: requieren PR + aviso al equipo.