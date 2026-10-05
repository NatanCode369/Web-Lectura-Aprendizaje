/**
 * ============================================================
 * CONTRATO DE API — Nueva lectura
 * ============================================================
 * 
 * Endpoints usados:
 *   GET  /api/v1/groups              → cargar grupos del docente
 *   POST /api/v1/readings            → crear lectura
 *   POST /api/v1/assignments         → crear asignación a un grupo
 * 
 * Auth: Bearer token (Supabase)
 * Rol requerido: teacher
 * 
 * POST /readings
 *   Request body:
 *     {
 *       title: string,
 *       authorName: string,
 *       summary: string,
 *       content: string,
 *       difficulty: 'easy' | 'medium' | 'hard',
 *       estimatedMinutes: number,
 *       activities: string[],   // ['trivia', 'verdadero-falso', ...]
 *       status: 'draft' | 'published'
 *     }
 *   Response 201:
 *     {
 *       id: string,
 *       title: string,
 *       version: 1,
 *       createdAt: ISO,
 *       updatedAt: ISO
 *     }
 * 
 * POST /assignments
 *   Request body:
 *     {
 *       readingId: string,
 *       groupId: string,
 *       availableFrom?: ISO,
 *       dueAt?: ISO
 *     }
 *   Response 201:
 *     {
 *       id: string,
 *       readingId: string,
 *       readingVersion: number,
 *       groupId: string,
 *       teacherId: string,
 *       activitySnapshot: [...],
 *       status: 'active',
 *       createdAt: ISO
 *     }
 * 
 * Errores comunes:
 *   400 VALIDATION_ERROR
 *   401 UNAUTHENTICATED
 *   403 FORBIDDEN — no es docente o el grupo no es suyo
 *   404 NOT_FOUND — grupo o lectura no existe
 * 
 * TODO backend: este archivo usa localStorage por ahora.
 * Cuando el backend esté listo:
 *   import { api } from '../../services/apiClient.js';
 *   const lectura = await api.post('/readings', data);
 *   for (const grupoId of gruposSeleccionados) {
 *     await api.post('/assignments', { readingId: lectura.id, groupId: grupoId });
 *   }
 * ============================================================
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const DOCENTE_ID = 'docente-demo';
const KEY_GRUPOS = `grupos_${DOCENTE_ID}`;
const KEY_LECTURAS = 'lecturas_docente';

// ============================================================
// REFERENCIAS
// ============================================================
const form = document.getElementById('reading-form');
const radios = document.querySelectorAll('input[name="formato"]');
const cajaTexto = document.getElementById('formato-texto');
const cajaPdf = document.getElementById('formato-pdf');
const $listaGrupos = document.getElementById('lista-grupos');

// ============================================================
// CARGAR GRUPOS DEL DOCENTE
// ============================================================
function cargarGrupos() {
  try {
    return JSON.parse(localStorage.getItem(KEY_GRUPOS) || '[]');
  } catch {
    return [];
  }
}

function renderGrupos() {
  if (!$listaGrupos) return;

  const grupos = cargarGrupos();

  if (grupos.length === 0) {
    $listaGrupos.innerHTML = `
      <p class="panel__hint">
        Aún no tienes grupos. <a href="./groups.html">Crea uno aquí</a> antes de asignar esta lectura.
      </p>
    `;
    return;
  }

  $listaGrupos.innerHTML = grupos.map((g) => `
    <label class="check">
      <input type="checkbox" name="grupos" value="${g.id}">
      <div>
        <p class="check__title">${g.nombre}</p>
        <p class="check__desc">
          ${g.estudiantes.length} estudiante${g.estudiantes.length === 1 ? '' : 's'} · ${g.year}
        </p>
      </div>
    </label>
  `).join('');
}

renderGrupos();

// ============================================================
// TOGGLE TEXTO / PDF
// ============================================================
radios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const esPdf = document.querySelector('input[name="formato"]:checked').value === 'pdf';
    cajaTexto.hidden = esPdf;
    cajaPdf.hidden = !esPdf;
  });
});

// ============================================================
// GUARDAR LECTURA
// ============================================================
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value.trim();
  const autor = document.getElementById('autor').value.trim();
  const nivel = document.getElementById('nivel').value;
  const minutos = Number(document.getElementById('minutos').value) || 15;
  const resumen = document.getElementById('resumen').value.trim();
  const formato = document.querySelector('input[name="formato"]:checked').value;
  const contenido = document.getElementById('contenido').value.trim();

  if (!titulo) {
    alert('El título es obligatorio.');
    return;
  }

  // Generar id
  const id = titulo.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now();

  // Actividades seleccionadas
  const actividadesSeleccionadas = [...document.querySelectorAll('input[name="actividades"]:checked')]
    .map((c) => c.value);

  // Grupos asignados
  const gruposSeleccionados = [...document.querySelectorAll('input[name="grupos"]:checked')]
    .map((c) => c.value);

  // Fechas
  const fechaInicio = document.getElementById('fecha-inicio').value;
  const fechaEntrega = document.getElementById('fecha-entrega').value;

  // Guardar lectura
  const lectura = {
    id,
    title: titulo,
    authorName: autor || 'Anónimo',
    difficulty: nivel === 'basico' ? 'easy' : nivel === 'intermedio' ? 'medium' : 'hard',
    estimatedMinutes: minutos,
    summary: resumen || 'Sin resumen.',
    content: formato === 'texto' ? contenido : '[PDF adjunto]',
    formato,
    actividades: actividadesSeleccionadas,
    gruposAsignados: gruposSeleccionados,
    fechaInicio,
    fechaEntrega,
    createdAt: new Date().toISOString()
  };

  // Lista global
  const lecturasGuardadas = JSON.parse(localStorage.getItem(KEY_LECTURAS) || '[]');
  lecturasGuardadas.push(lectura);
  localStorage.setItem(KEY_LECTURAS, JSON.stringify(lecturasGuardadas));

  // Guardar por id
  localStorage.setItem(`lectura_${id}`, JSON.stringify(lectura));

  // Guardar actividades vacías para que reading-activity.js no caiga en el fallback
  if (!localStorage.getItem(`actividades_${id}`)) {
    localStorage.setItem(`actividades_${id}`, JSON.stringify({
      trivia: [],
      verdaderoFalso: [],
      detective: { target: '', synonyms: [], distractors: [] },
      order: [],
      mindMap: []
    }));
  }

  // Crear tareas para los grupos asignados
  if (gruposSeleccionados.length > 0) {
    const todosGrupos = cargarGrupos();
    gruposSeleccionados.forEach((grupoId) => {
      const grupo = todosGrupos.find((g) => g.id === grupoId);
      if (!grupo) return;

      grupo.estudiantes.forEach((emailEstudiante) => {
        const keyAsignaciones = `asignaciones_${emailEstudiante}`;
        const asignaciones = JSON.parse(localStorage.getItem(keyAsignaciones) || '[]');

        asignaciones.push({
          id: `${id}_${emailEstudiante}`,
          lecturaId: id,
          readingTitle: titulo,
          readingSummary: resumen,
          groupName: grupo.nombre,
          estimatedMinutes: minutos,
          status: 'pending',
          dueAt: fechaEntrega || null,
          assignedAt: new Date().toISOString()
        });

        localStorage.setItem(keyAsignaciones, JSON.stringify(asignaciones));
      });
    });
  }

  alert(`✅ Lectura "${titulo}" publicada correctamente.`);
  window.location.href = './dashboard-teacher.html';
});