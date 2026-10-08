import '../../utils/analytics.js';
/**
 * ============================================================
 * Estadísticas del docente — Conectado al backend analytics
 * ============================================================
 *
 * Endpoints usados (ver services/analyticsService.js):
 *   GET /api/v1/analytics/groups/:groupId    → métricas diarias por grupo
 *   GET /api/v1/analytics/readings/:readingId → métricas diarias por lectura
 *
 * Auth: Bearer token (Supabase) · Rol requerido: teacher
 * ============================================================
 */

import { groupsService } from '../../services/groupsService.js';
import { teacherReadingService } from '../../services/teacherReadingsService.js';
import { analyticsService } from '../../services/analyticsService.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", ''');
}

const $ = (id) => document.getElementById(id);

function showError(message) {
  console.error('[stats] Error:', message);
  const $tbody = $('lecturas-body');
  if ($tbody) {
    $tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: #b91c1c;">
          Error: ${escapeHtml(message)}
        </td>
      </tr>
    `;
  }
}

async function renderStats(grupos, lecturas) {
  if ($('stat-grupos')) $('stat-grupos').textContent = grupos.length;
  if ($('stat-lecturas')) $('stat-lecturas').textContent = lecturas.length;

  try {
    const detalles = await Promise.all(grupos.map((g) => groupsService.getById(g._id)));
    const total = detalles.reduce((acc, g) => acc + (g.studentIds?.length || 0), 0);
    if ($('stat-conectados')) $('stat-conectados').textContent = total;
  } catch {
    if ($('stat-conectados')) $('stat-conectados').textContent = '—';
  }
}

function renderLecturas(lecturas, asignaciones) {
  const $tbody = $('lecturas-body');
  if (!$tbody) return;

  if (lecturas.length === 0) {
    $tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: #64748b;">
          Aún no hay lecturas publicadas. <a href="./reading-new.html">Crea una aquí</a>.
        </td>
      </tr>
    `;
    return;
  }

  $tbody.innerHTML = lecturas.map((l) => {
    const cantidadGrupos = asignaciones.filter((a) => a.readingId === l.id).length;

    return `
      <tr>
        <td>${escapeHtml(l.title)}</td>
        <td>${l.difficulty === 'easy' ? 'Fácil' : l.difficulty === 'medium' ? 'Medio' : 'Avanzado'}</td>
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

async function renderProgreso(grupos, lecturas) {
  const $lista = document.querySelector('.progress-list');
  if (!$lista) return;

  if (grupos.length === 0) {
    $lista.innerHTML = '<p class="panel__hint">Aún no tienes grupos. <a href="./groups.html">Crea uno aquí</a>.</p>';
    return;
  }
  if (lecturas.length === 0) {
    $lista.innerHTML = '<p class="panel__hint">Aún no hay lecturas publicadas. El progreso aparecerá cuando asignes lecturas.</p>';
    return;
  }

  try {
    const filas = await Promise.all(grupos.map(async (g) => {
      let pct = 0;
      try {
        const { rows = [] } = await analyticsService.byGroup(g._id);
        const asignadas = rows.reduce((acc, r) => acc + (r.assignedCount || 0), 0);
        const completadas = rows.reduce((acc, r) => acc + (r.completedCount || 0), 0);
        pct = asignadas > 0 ? Math.round((completadas / asignadas) * 100) : 0;
      } catch {
        pct = 0;
      }
      return `
        <div>
          <div class="progress__row"><span>${escapeHtml(g.name)}</span><span>${pct}%</span></div>
          <div class="progress"><div class="progress__bar" style="width: ${pct}%"></div></div>
        </div>
      `;
    }));
    $lista.innerHTML = filas.join('');
  } catch (error) {
    console.error('[stats] Error al cargar progreso por grupo:', error);
    $lista.innerHTML = '<p class="panel__hint">No se pudo cargar el progreso por grupo.</p>';
  }
}

async function init() {
  try {
    const [gruposResp, lecturasResp, asignacionesResp] = await Promise.all([
      groupsService.list(),
      teacherReadingService.listPublished(),
      (async () => {
        // Usamos el teacherAssignmentService indirectamente
        const { api } = await import('../../services/apiClient.js');
        const resp = await api.get('/assignments');
        return resp;
      })()
    ]);
    const grupos = gruposResp.items || [];
    const lecturas = lecturasResp.data || [];
    const asignaciones = asignacionesResp.items || [];

    renderLecturas(lecturas, asignaciones);
    renderStats(grupos, lecturas);
    await renderProgreso(grupos, lecturas);
  } catch (error) {
    showError(error.message);
  }
}

init();