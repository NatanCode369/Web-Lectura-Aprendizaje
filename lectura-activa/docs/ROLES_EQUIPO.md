# Lectura Activa — División del trabajo

**Equipo:** 7 personas  
**Versión:** 1.0  
**Basado en:** CONTEXTO_TECNICO.md

---

## 1. Los 7 roles del equipo

Cada persona tiene un rol principal y un segundo foco. Así nadie queda sin tarea y no se duplica trabajo.

### Persona 1 — Líder técnico
Se encarga de que todo el equipo trabaje coordinado. Revisa el código antes de que se suba. Toma las decisiones de arquitectura y las deja escritas en documentos llamados ADR. También mantiene la documentación del proyecto.

### Diego — Backend de identidad y usuarios
Programa todo lo relacionado con registro, inicio de sesión, usuarios e instituciones. Se asegura de que solo se registren correos de dominios autorizados. Maneja la seguridad del login.

### Adrián — Backend de lecturas y actividades
Programa todo lo relacionado con crear, editar y publicar lecturas. También las actividades que van dentro de cada lectura. Es quien mejor entiende cómo se guardan los datos en MongoDB.

### Aaron — Backend de grupos, asignaciones y analítica
Programa la creación de grupos, la asignación de lecturas a los grupos y las estadísticas que ven los docentes. Es quien maneja los índices de la base de datos.

### Omar — Frontend del estudiante
Programa todas las pantallas que usa el estudiante: catálogo de lecturas, lectura, actividades, envío de respuestas y progreso personal. Se asegura de que todo sea accesible.

### José — Frontend del docente y administrador
Programa las pantallas del docente y del administrador: crear lecturas, crear grupos, asignar tareas y ver estadísticas. También es dueño de los componentes visuales que se reutilizan en toda la app.

### Jefferson y Luis — Plataforma, DevOps y pruebas
Se encarga de que todo se despliegue bien: servidores, base de datos, almacenamiento, respaldos y seguridad del servidor. También escribe las pruebas automáticas y configura las alertas.

---

## 2. Las 4 fases del proyecto

El proyecto se divide en 4 fases. Cada fase dura aproximadamente 2 o 3 semanas. Al final de cada fase hay un "hito", que es algo concreto que debe funcionar para poder pasar a la siguiente fase.

### Fase 0 — Preparar el terreno (semanas 1 y 2)

**¿De qué se trata?**  
Antes de programar funciones, hay que dejar listo el esqueleto del proyecto: carpetas, herramientas, servidores y base de datos. Nadie programa funciones todavía.

**¿Qué debe funcionar al final?**  
El servidor responde en internet y el sitio web muestra una página simple. Todavía no hay login ni lecturas.

**Tareas y responsables:**
- Crear carpetas, reglas de estilo de código y pruebas básicas. **Responsable:** Persona 1. **Apoya:** Persona 7.
- Configurar MongoDB local para desarrollo. **Responsable:** Persona 7. **Apoya:** Persona 1.
- Configurar variables de entorno, logs y manejo de errores. **Responsable:** Persona 7. **Apoya:** Persona 1.
- Diseñar el modelo de datos y los índices iniciales. **Responsable:** Persona 3. **Apoya:** Persona 4.
- Configurar el sistema de login (Supabase Auth) con dominios permitidos. **Responsable:** Persona 2. **Apoya:** Persona 7.
- Configurar servidores: Cloudflare Pages, Cloud Run y MongoDB Atlas. **Responsable:** Persona 7. **Apoya:** Persona 1.
- Armar el esqueleto del frontend (Vite, navegación, estilos base). **Responsable:** Persona 6. **Apoya:** Persona 5.

### Fase 1 — Login y lecturas (semanas 3, 4 y 5)

**¿De qué se trata?**  
Aquí se construye lo mínimo para que un estudiante pueda entrar y ver lecturas. También el docente puede crear lecturas.

**¿Qué debe funcionar al final?**  
Un estudiante se registra con su correo institucional, entra y ve el catálogo de lecturas publicadas. Un docente puede crear y publicar una lectura.

**Tareas y responsables:**
- Programar registro, login, usuarios e instituciones. **Responsable:** Persona 2. **Apoya:** Persona 1.
- Programar los endpoints del perfil (ver y editar mis datos). **Responsable:** Persona 2. **Apoya:** Persona 7.
- Programar la creación, edición y publicación de lecturas. **Responsable:** Persona 3. **Apoya:** Persona 1.
- Programar las actividades que van dentro de cada lectura. **Responsable:** Persona 3. **Apoya:** Persona 1.
- Programar pantallas de login, registro y recuperación de contraseña. **Responsable:** Persona 6. **Apoya:** Persona 2.
- Programar pantalla de catálogo y detalle de lectura para el estudiante. **Responsable:** Persona 5. **Apoya:** Persona 3.
- Escribir pruebas de seguridad de las lecturas. **Responsable:** Persona 7. **Apoya:** Persona 3.

### Fase 2 — Grupos, tareas y flujo del estudiante (semanas 6, 7 y 8)

**¿De qué se trata?**  
Es la fase más importante. Aquí ya funciona el flujo completo: el docente crea un grupo, asigna una lectura y el estudiante la lee, responde y recibe retroalimentación.

**¿Qué debe funcionar al final?**  
El flujo completo descrito en el documento técnico. Un docente asigna una lectura a un grupo, el estudiante la completa y el sistema guarda su resultado.

**Tareas y responsables:**
- Programar creación y gestión de grupos. **Responsable:** Persona 4. **Apoya:** Persona 1.
- Programar asignación de lecturas a grupos. **Responsable:** Persona 4. **Apoya:** Persona 3.
- Programar inicio de tarea y envío de respuestas. **Responsable:** Persona 4. **Apoya:** Persona 3.
- Programar guardado del progreso del estudiante. **Responsable:** Persona 4. **Apoya:** Persona 7.
- Programar pantallas del docente para crear grupos y asignar lecturas. **Responsable:** Persona 6. **Apoya:** Persona 4.
- Programar pantallas del estudiante para leer, responder y ver retroalimentación. **Responsable:** Persona 5. **Apoya:** Persona 3.
- Escribir pruebas del flujo completo. **Responsable:** Persona 7. **Apoya:** todo el equipo.

### Fase 3 — Estadísticas y cierre (semanas 9 y 10)

**¿De qué se trata?**  
Aquí se agregan las estadísticas para el docente y se pule todo: seguridad, respaldos, accesibilidad y documentación final.

**¿Qué debe funcionar al final?**  
La versión 1 está lista para unos 250 usuarios, con respaldos, alertas y pruebas críticas funcionando.

**Tareas y responsables:**
- Programar el cálculo diario de estadísticas. **Responsable:** Persona 4. **Apoya:** Persona 7.
- Programar endpoints de estadísticas para el docente. **Responsable:** Persona 4. **Apoya:** Persona 7.
- Programar pantalla de estadísticas para el docente. **Responsable:** Persona 6. **Apoya:** Persona 4.
- Configurar límites de uso, protección contra ataques y cabeceras de seguridad. **Responsable:** Persona 7. **Apoya:** Persona 2.
- Configurar respaldos automáticos, alertas y una prueba de restauración. **Responsable:** Persona 7. **Apoya:** Persona 1.
- Revisar accesibilidad y textos en español. **Responsable:** Persona 5. **Apoya:** Persona 6.
- Escribir documentos finales y limpiar datos de prueba. **Responsable:** Persona 1. **Apoya:** todo el equipo.

---

## 3. Reglas para trabajar en equipo

Estas reglas evitan que dos personas trabajen en lo mismo o que se rompa el proyecto.

1. Cada módulo tiene un solo dueño. Si alguien más quiere cambiarlo, debe pedirle permiso y hacer una revisión conjunta.
2. Antes de programar una pantalla, el backend debe entregar el contrato de la API (qué recibe, qué devuelve). Si cambia el contrato, se avisa a todo el equipo.
3. Las tareas transversales (seguridad, índices, pruebas, respaldos) tienen dueño desde el inicio. No se dejan para el final.
4. Cada endpoint nuevo debe traer cuatro cosas: validación de datos, control de permisos, índice justificado y una prueba automática.
5. No se agregan frameworks nuevos ni servicios nuevos sin aprobación del líder técnico.
6. Cada persona trabaja en su propia rama. Al subir cambios, describe qué capa tocó y qué parte de la base de datos afectó.

---

## 4. Riesgos y cómo evitarlos

**Riesgo 1:** La persona 4 tiene demasiado trabajo.  
**Solución:** en la Fase 2, la persona 1 o la persona 3 apoyan con las estadísticas.

**Riesgo 2:** El frontend del estudiante y el del docente duplican componentes.  
**Solución:** la persona 6 es dueña de los componentes compartidos. La persona 5 los usa, no los reinventa.

**Riesgo 3:** La persona 7 se vuelve cuello de botella al inicio.  
**Solución:** la persona 1 ayuda con la configuración básica de integración continua.

**Riesgo 4:** Se define el modelo de datos muy tarde.  
**Solución:** se cierra en la Fase 0 con revisión de todo el equipo.

**Riesgo 5:** Las pruebas de seguridad se dejan para el final.  
**Solución:** se escriben al mismo tiempo que cada endpoint.

---

## 5. Resumen en una tabla

| Persona | Rol principal | Segundo foco |
|---------|---------------|--------------|
| 1 | Líder técnico y arquitectura | Documentación |
| 2 | Backend de login y usuarios | Seguridad del login |
| 3 | Backend de lecturas y actividades | Modelo de datos MongoDB |
| 4 | Backend de grupos, tareas y estadísticas | Índices de base de datos |
| 5 | Frontend del estudiante | Accesibilidad |
| 6 | Frontend del docente y administrador | Diseño de componentes |
| 7 | Servidores, despliegue y pruebas | Seguridad y respaldos |

---

*Fin del documento.*