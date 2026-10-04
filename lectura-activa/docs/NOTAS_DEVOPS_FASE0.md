# ️ Notas de Desbloqueo de Entorno Local (Fase 0) - DevOps

**Autor:** Persona 7 (DevOps / Plataforma)  
**Fecha:** 03 de Octubre, 2026  
**Objetivo:** Documentar los ajustes realizados para lograr que `npm run dev` funcione localmente y alinear al equipo sobre los archivos temporales (stubs).

---

## 1. Lo que se arregló (Fixes)

Para que el servidor arrancara, fue necesario corregir varias inconsistencias entre el código subido y la arquitectura definida en `CONTEXTO_TECNICO.md`:

* **Rutas de Importación ESM:** Se corrigieron múltiples rutas que apuntaban a `../../config/db.js` o archivos inexistentes. Ahora todas las conexiones a la base de datos y utilidades transversales apuntan correctamente a la Capa Transversal (`../../shared/...`).
* **Traducción de Joi a Zod:** Los archivos `groups.schemas.js`, `assignments.schemas.js` y `attempts.schemas.js` usaban la librería `joi`, la cual no está en nuestro `package.json`. Se tradujeron completamente a `zod` manteniendo la misma lógica de negocio y validaciones cruzadas.
* **Entry Point en Windows:** Se ajustó la detección del archivo principal en `server.js` (`import.meta.url` vs `process.argv[1]`) para evitar que el servidor se cerrara inmediatamente al usar `node --watch` en Windows.
* **Exportaciones faltantes:** Se completaron las exportaciones en `shared/errors/index.js` y `shared/authorization/policies.js` para que las capas de Dominio y Rutas pudieran importar `NotFoundError`, `requireRole`, etc.

## 2. Lo que se agregó (Additions)

* **Clases de Error Específicas:** Se agregaron `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError` y `ForbiddenError` en `shared/errors/AppError.js` para hacer el código de negocio más expresivo.
* **Utilidad de Fechas:** Se creó `shared/utils/dates.js` con funciones como `utcDayKey`, `startOfUtcDay` y `endOfUtcDay` para estandarizar el manejo de zonas horarias en las analíticas.
* **Barrel Files:** Se crearon archivos `index.js` en `shared/errors/` y `shared/utils/` para centralizar exportaciones.

## 3. ⚠️ Archivos Temporales (Stubs) - ¡IMPORTANTE!

Para desbloquear el arranque del servidor sin detener el trabajo en paralelo, se crearon **Stubs (esqueletos temporales)**. Estos archivos cumplen con el "contrato" de importación, pero **NO tienen la lógica real de MongoDB**. 

### 📁 `apps/api/src/modules/readings/readings.repository.js`
* **Estado actual:** Stub. Devuelve datos mockeados.
* **Responsable:** **Persona 3 (Adrián)**. 
* **Acción requerida:** Reemplazar este archivo con la implementación real de MongoDB para las lecturas. Asegúrate de exportar el objeto `readingsRepository` con los métodos `findById` e `findByIdAndVersion`.

### 📁 `apps/api/src/shared/auth/session.js`
* **Estado actual:** Stub/Wrapper básico.
* **Responsable:** **Persona 2 (Diego)**.
* **Acción requerida:** Integrar la lógica real de validación de JWT de Supabase aquí. El middleware `requireSession` debe validar el token y adjuntar el objeto `user` al `request` de Fastify.

## 4. Configuración Local (.env)

El servidor arranca usando el `docker-compose.yml` local. Asegúrate de tener Docker Desktop corriendo y ejecuta:
```bash
docker compose up -d
npm run dev