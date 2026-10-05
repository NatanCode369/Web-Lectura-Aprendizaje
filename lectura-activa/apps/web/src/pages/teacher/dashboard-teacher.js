/**
 * ============================================================
 * CONTRATO DE API — Dashboard del docente
 * ============================================================
 * 
 * Endpoints usados:
 *   GET /api/v1/groups        → lista de grupos del docente
 *   GET /api/v1/readings      → lista de lecturas del docente
 * 
 * Auth: Bearer token (Supabase)
 * Rol requerido: teacher
 * 
 * GET /groups
 *   Response 200:
 *     {
 *       data: [
 *         {
 *           id: string,
 *           name: string,
 *           schoolYear: number,
 *           studentIds: string[],
 *           status: 'active' | 'archived',
 *           ...
 *         }
 *       ]
 *     }
 * 
 * GET /readings
 *   Response 200:
 *     {
 *       data: [
 *         {
 *           id: string,
 *           title: string,
 *           difficulty: 'easy' | 'medium' | 'hard',
 *           estimatedMinutes: number,
 *           status: 'draft' | 'published',
 *           ...
 *         }
 *       ]
 *     }
 * 
 * Errores comunes:
 *   401 UNAUTHENTICATED — sin token o expirado
 *   403 FORBIDDEN — no es docente
 * 
 * TODO backend: este archivo usa localStorage por ahora.
 * Cuando el backend esté listo:
 *   import { api } from '../../services/apiClient.js';
 *   const [grupos, lecturas] = await Promise.all([
 *     api.get('/groups'),
 *     api.get('/readings')
 *   ]);
 * ============================================================
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const DOCENTE_ID = 'docente-demo'; // TODO: reemplazar por user.id real
const KEY_GRUPOS = `grupos_${DOCENTE_ID}`;
const KEY_LECTURAS = 'lecturas_docente';

const ETIQUETA_DIFICULTAD = { easy: 'Básico', medium: 'Intermedio', hard: 'Avanzado' };

// ============================================================
// UTILIDADES
// ============================================================
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cargarGrupos() {
  try {
    return JSON.parse(localStorage.getItem(KEY_GRUPOS) || '[]');
  } catch {
    return [];
  }
}

function cargarLecturas() {
  try {
    return JSON.parse(localStorage.getItem(KEY_LECTURAS) || '[]');
  } catch {
    return [];
  }
}

// ============================================================
// STATS (los 3 números de arriba)
// ============================================================
function renderStats() {
  const grupos = cargarGrupos();
  const lecturas = cargarLecturas();
  const totalEstudiantes = grupos.reduce((acc, g) => acc + (g.estudiantes?.length || 0), 0);

  const $grupos = document.getElementById('stat-grupos');
  const $lecturas = document.getElementById('stat-lecturas');
  const $conectados = document.getElementById('stat-conectados');

  if ($grupos) $grupos.textContent = grupos.length;
  if ($lecturas) $lecturas.textContent = lecturas.length;
  if ($conectados) $conectados.textContent = totalEstudiantes;
}

// ============================================================
// TABLA DE LECTURAS
// ============================================================
function renderLecturas() {
  const lecturas = cargarLecturas();
  const $tbody = document.getElementById('lecturas-body');
  if (!$tbody) return;

  if (lecturas.length === 0) {
    $tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: #64748b;">
          Aún no has creado ninguna lectura. <a href="./reading-new.html">Crea una aquí</a>.
        </td>
      </tr>
    `;
    return;
  }

  $tbody.innerHTML = lecturas.map((l) => {
    const cantidadGrupos = (l.gruposAsignados || []).length;

    return `
      <tr>
        <td>${escapeHtml(l.title)}</td>
        <td>${ETIQUETA_DIFICULTAD[l.difficulty] || '—'}</td>
        <td>${l.estimatedMinutes} min</td>
        <td><span class="badge badge--ok">Publicada</span></td>
        <td>${cantidadGrupos}</td>
        <td>
          <div class="table__actions">
            <a href="./reading-edit.html?id=${encodeURIComponent(l.id)}" class="btn btn--ghost btn--sm">Editar</a>
            <a href="./stats.html?id=${encodeURIComponent(l.id)}" class="btn btn--ghost btn--sm">Estadísticas</a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// PROGRESO POR GRUPO
// ============================================================
function renderProgreso() {
  const grupos = cargarGrupos();
  const lecturas = cargarLecturas();
  const $lista = document.querySelector('.progress-list');
  if (!$lista) return;

  if (grupos.length === 0) {
    $lista.innerHTML = '<p class="panel__hint">Aún no tienes grupos. <a href="./groups.html">Crea uno aquí</a>.</p>';
    return;
  }

  if (lecturas.length === 0) {
    $lista.innerHTML = '<p class="panel__hint">Aún no has creado lecturas. El progreso aparecerá cuando asignes lecturas.</p>';
    return;
  }

  $lista.innerHTML = grupos.map((g) => {
    const totalEstudiantes = g.estudiantes?.length || 0;

    if (totalEstudiantes === 0) {
      return `
        <div>
          <div class="progress__row"><span>${escapeHtml(g.nombre)}</span><span>0%</span></div>
          <div class="progress"><div class="progress__bar" style="width: 0%"></div></div>
        </div>
      `;
    }

    let totalAsignaciones = 0;
    let completadas = 0;

    g.estudiantes.forEach((email) => {
      const asignaciones = JSON.parse(localStorage.getItem(`asignaciones_${email}`) || '[]');
      asignaciones.forEach((a) => {
        if (lecturas.some((l) => l.id === a.lecturaId)) {
          totalAsignaciones++;
          const resultado = localStorage.getItem(`resultado_${a.lecturaId}`);
          if (resultado) completadas++;
        }
      });
    });

    const pct = totalAsignaciones > 0 ? Math.round((completadas / totalAsignaciones) * 100) : 0;

    return `
      <div>
        <div class="progress__row"><span>${escapeHtml(g.nombre)}</span><span>${pct}%</span></div>
        <div class="progress"><div class="progress__bar" style="width: ${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

// ============================================================
// INIT
// ============================================================
renderStats();
renderLecturas();
renderProgreso();