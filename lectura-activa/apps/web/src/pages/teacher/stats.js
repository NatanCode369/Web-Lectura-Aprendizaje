import '../../utils/analytics.js';
/**
 * ============================================================
 * Estadísticas del docente — Datos en tiempo real
 * ============================================================
 */

import { groupsService } from '../../services/groupsService.js';
import { teacherReadingService } from '../../services/teacherReadingsService.js';
import { analyticsService } from '../../services/analyticsService.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const $ = (id) => document.getElementById(id);

let grupos = [];
let lecturas = [];

/* ============================================================
   Poblar dropdowns
   ============================================================ */
function poblarGrupos(gruposData) {
  const $select = $('filtro-grupo');
  if (!$select) return;

  $select.innerHTML = `
    <option value="todos">Todos los grupos</option>
    ${gruposData
      .map(
        (g) =>
          `<option value="${escapeHtml(g._id)}">${escapeHtml(g.name)} (${escapeHtml(g.schoolYear || '')})</option>`
      )
      .join('')}
  `;
}

function poblarLecturas(lecturasData) {
  const $select = $('filtro-lectura');
  if (!$select) return;

  $select.innerHTML = `
    <option value="">Todas las lecturas</option>
    ${lecturasData
      .map(
        (l) =>
          `<option value="${escapeHtml(l.id || l._id)}">${escapeHtml(l.title)}</option>`
      )
      .join('')}
  `;
}

/* ============================================================
   Formatear tiempo
   ============================================================ */
function formatTiempo(seconds) {
  if (!seconds || seconds === 0) return '—';
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}

/* ============================================================
   Actualizar contadores
   ============================================================ */
function actualizarContadores(summary) {
  if (!summary) {
    if ($('stat-promedio')) $('stat-promedio').textContent = '—';
    if ($('stat-tiempo')) $('stat-tiempo').textContent = '—';
    if ($('stat-aldia')) $('stat-aldia').textContent = '—';
    if ($('stat-atrasados')) $('stat-atrasados').textContent = '—';
    return;
  }

  if ($('stat-promedio')) {
    $('stat-promedio').textContent =
      summary.averageScore > 0 ? `${summary.averageScore.toFixed(1)} / 100` : '—';
  }
  if ($('stat-tiempo')) {
    $('stat-tiempo').textContent = formatTiempo(summary.averageTimeSeconds);
  }
  if ($('stat-aldia')) {
    $('stat-aldia').textContent = `${summary.completedCount ?? 0} / ${summary.assignedCount ?? 0}`;
  }
  if ($('stat-atrasados')) {
    const atrasados = (summary.assignedCount ?? 0) - (summary.completedCount ?? 0);
    $('stat-atrasados').textContent = String(Math.max(0, atrasados));
  }
}

/* ============================================================
   Progreso por grupo
   ============================================================ */
async function renderProgresoPorGrupo() {
  const $lista = $('progreso-grupos');
  if (!$lista) return;

  if (grupos.length === 0) {
    $lista.innerHTML =
      '<p class="panel__hint">Aún no tienes grupos. <a href="./groups.html">Crea uno aquí</a>.</p>';
    return;
  }

  $lista.innerHTML = '<p class="panel__hint">Cargando...</p>';

  try {
    const filas = await Promise.all(
      grupos.map(async (g) => {
        let summary = null;
        try {
          const { summary: s } = await analyticsService.byGroup(g._id);
          summary = s;
        } catch (e) {
          console.warn(`[stats] Error cargando grupo ${g.name}:`, e);
        }

        const pct = summary
          ? Math.round((summary.completionRate ?? 0) * 100)
          : 0;

        return `
          <div>
            <div class="progress__row"><span>${escapeHtml(g.name)}</span><span>${pct}%</span></div>
            <div class="progress"><div class="progress__bar" style="width: ${pct}%"></div></div>
          </div>
        `;
      })
    );
    $lista.innerHTML = filas.join('');
  } catch (error) {
    console.error('[stats] Error al cargar progreso por grupo:', error);
    $lista.innerHTML = '<p class="panel__hint">No se pudo cargar el progreso por grupo.</p>';
  }
}

/* ============================================================
   Progreso por estudiante
   ============================================================ */
async function renderProgresoPorEstudiante() {
  const $tbody = $('estudiantes-body');
  if (!$tbody) return;

  try {
    // Obtener todos los studentAssignments de los grupos del docente
    const resp = await analyticsService.summaryByTeacher();
    const estudiantes = resp.items || [];

    if (estudiantes.length === 0) {
      $tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 30px; color: #64748b;">
            Aún no hay estudiantes con tareas asignadas.
          </td>
        </tr>
      `;
      return;
    }

    $tbody.innerHTML = estudiantes
      .map((e) => {
        const estado = e.completed
          ? '✅ Al día'
          : e.pending > 0
            ? '⏳ Pendiente'
            : '— Sin empezar';
        const puntaje = e.score > 0 ? `${e.score} pts` : '—';
        const tiempo = e.timeSpentSeconds > 0 ? formatTiempo(e.timeSpentSeconds) : '—';

        return `
          <tr>
            <td>${escapeHtml(e.fullName || e.email || 'Estudiante')}</td>
            <td>${escapeHtml(e.groupName || '—')}</td>
            <td>${estado}</td>
            <td>${puntaje}</td>
            <td>${tiempo}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('[stats] Error al cargar estudiantes:', error);
    $tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px; color: #b91c1c;">
          Error al cargar estudiantes: ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

/* ============================================================
   Recalcular todo
   ============================================================ */
async function recalcular() {
  const grupoId = $('filtro-grupo')?.value;
  const lecturaId = $('filtro-lectura')?.value;

  // Si hay un grupo seleccionado → mostrar stats de ese grupo
  if (grupoId && grupoId !== 'todos') {
    try {
      const { summary } = await analyticsService.byGroup(grupoId);
      actualizarContadores(summary);
    } catch (e) {
      console.warn('[stats] Error cargando grupo:', e);
      actualizarContadores(null);
    }
  } else {
    // "Todos los grupos" → agregar todos
    actualizarContadores(null);
  }

  await renderProgresoPorGrupo();
  await renderProgresoPorEstudiante();
}

/* ============================================================
   Init
   ============================================================ */
async function init() {
  try {
    const [gruposResp, lecturasResp] = await Promise.all([
      groupsService.list(),
      teacherReadingService.listPublished({ limit: 100 }),
    ]);

    grupos = gruposResp.items || [];
    lecturas = lecturasResp.data || [];

    poblarGrupos(grupos);
    poblarLecturas(lecturas);

    $('filtro-grupo')?.addEventListener('change', recalcular);
    $('filtro-lectura')?.addEventListener('change', recalcular);

    await recalcular();
  } catch (error) {
    console.error('[stats] Error al inicializar:', error);
  }
}

init();