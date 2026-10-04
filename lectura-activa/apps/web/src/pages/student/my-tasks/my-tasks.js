/**
 * my-tasks.js
 * Muestra las tareas asignadas al estudiante.
 * Lee de localStorage las asignaciones que crea el docente en reading-new.js.
 * 
 * TODO backend: reemplazar por GET /api/v1/assignments
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const ESTUDIANTE_EMAIL = 'estudiante@kinal.edu.gt'; // TODO: reemplazar con user.email real
const KEY_ASIGNACIONES = `asignaciones_${ESTUDIANTE_EMAIL}`;
const KEY_RESULTADOS = 'resultado'; // los resultados se guardan como resultado_${lecturaId}

// ============================================================
// REFERENCIAS
// ============================================================
const $grupos = document.querySelectorAll('.tasks__group');
const $stats = document.querySelectorAll('.tasks__stat');
const $vacio = document.querySelector('.tasks__empty');

let filtroActivo = null;
let tareas = [];

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

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${year} ${hh}:${mm}`;
}

function estaProximaAVencer(iso) {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  const tresDias = 3 * 24 * 60 * 60 * 1000;
  return diff > 0 && diff < tresDias;
}

// ============================================================
// CARGAR ASIGNACIONES
// ============================================================
function cargarAsignaciones() {
  try {
    const lista = JSON.parse(localStorage.getItem(KEY_ASIGNACIONES) || '[]');

    // Para cada asignación, verificar si el estudiante ya la completó
    return lista.map((a) => {
      const resultadoKey = `resultado_${a.lecturaId}`;
      const resultadoGuardado = localStorage.getItem(resultadoKey);

      if (resultadoGuardado) {
        const r = JSON.parse(resultadoGuardado);
        return {
          ...a,
          status: 'completed',
          completedAt: r.fecha,
          score: calcularScore(r)
        };
      }

      // Si tiene tiempoUsado pero no está marcada como completada, está en progreso
      // Por ahora, todas empiezan como pending
      return a;
    });
  } catch {
    return [];
  }
}

function calcularScore(resultado) {
  // Resultado tiene: { respuestas: {...}, tiempoUsadoSegundos: N }
  // Necesitamos las actividades originales para saber cuántas correctas hay
  // Por ahora, retornamos un mock (o podemos implementarlo bien si tenemos acceso a las actividades)
  return resultado?.score || 85; // temporal
}

// ============================================================
// AGRUPAR POR ESTADO
// ============================================================
function agruparTareas() {
  return {
    pending: tareas.filter((t) => t.status === 'pending'),
    in_progress: tareas.filter((t) => t.status === 'in_progress'),
    completed: tareas.filter((t) => t.status === 'completed')
  };
}

// ============================================================
// CONTAR
// ============================================================
function contarPorEstado(estado) {
  return tareas.filter((t) => t.status === estado).length;
}

// ============================================================
// CREAR TARJETA
// ============================================================
function crearTarjeta(t) {
  const esPending = t.status === 'pending';
  const esInProgress = t.status === 'in_progress';
  const esCompleted = t.status === 'completed';

  const statusIcon = esPending ? '●' : esInProgress ? '◐' : '✓';
  const statusClass = `task-card__status--${t.status}`;

  const href = esCompleted
    ? `../feedback/feedback.html?id=${t.lecturaId}`
    : `../reading-activity/reading-activity.html?id=${t.lecturaId}`;

  const dueHTML = esCompleted
    ? `<span class="task-card__score">${t.score} / 100</span>`
    : t.dueAt
      ? `<span class="task-card__due ${estaProximaAVencer(t.dueAt) ? 'task-card__due--soon' : ''}">Vence: ${formatearFecha(t.dueAt)}</span>`
      : '';

  const metaHTML = esCompleted
    ? `<span class="task-card__completed-date">Completada el ${formatearFecha(t.completedAt)}</span>`
    : t.estimatedMinutes
      ? `<span class="task-card__minutes"><span aria-hidden="true">⏱</span> ${t.estimatedMinutes} min</span>`
      : '';

  const actionText = esCompleted
    ? 'Ver resultados'
    : esInProgress
      ? 'Continuar leyendo'
      : 'Empezar a leer';

  return `
    <li>
      <a href="${href}" class="task-card task-card--${t.status}" data-id="${escapeHtml(t.lecturaId)}">
        <div class="task-card__header">
          <span class="task-card__status ${statusClass}" aria-hidden="true">${statusIcon}</span>
          <h3 class="task-card__title">${escapeHtml(t.readingTitle || 'Lectura')}</h3>
          ${dueHTML}
        </div>
        ${t.readingSummary ? `<p class="task-card__summary">${escapeHtml(t.readingSummary)}</p>` : ''}
        <div class="task-card__meta">
          ${t.groupName ? `<span class="task-card__group">Grupo: ${escapeHtml(t.groupName)}</span>` : ''}
          ${metaHTML}
        </div>
        <span class="task-card__action">
          ${actionText}
          <span aria-hidden="true">→</span>
        </span>
      </a>
    </li>
  `;
}

// ============================================================
// RENDER
// ============================================================
function renderGrupo(estado) {
  const tareasFiltradas = tareas.filter((t) => t.status === estado);
  const $grupo = document.querySelector(`.tasks__group[data-status="${estado}"]`);
  if (!$grupo) return;

  const $lista = $grupo.querySelector('.tasks__group-list');
  const $count = $grupo.querySelector('.tasks__group-count');

  $count.textContent = tareasFiltradas.length;

  if (tareasFiltradas.length === 0) {
    $grupo.hidden = true;
    return;
  }

  $grupo.hidden = false;
  $lista.innerHTML = tareasFiltradas.map(crearTarjeta).join('');
}

function renderTodo() {
  renderGrupo('pending');
  renderGrupo('in_progress');
  renderGrupo('completed');

  // Contadores de las stats
  $stats.forEach((btn) => {
    const estado = btn.dataset.filter;
    const num = btn.querySelector('.tasks__stat-number');
    if (num) num.textContent = contarPorEstado(estado);
  });

  // Estado vacío
  if (tareas.length === 0) {
    $vacio.hidden = false;
    document.querySelector('.tasks__list').hidden = true;
    document.querySelector('.tasks__stats').hidden = true;
  } else {
    $vacio.hidden = true;
    document.querySelector('.tasks__list').hidden = false;
    document.querySelector('.tasks__stats').hidden = false;
  }
}

// ============================================================
// FILTROS
// ============================================================
$stats.forEach((btn) => {
  btn.addEventListener('click', () => {
    const estado = btn.dataset.filter;

    if (filtroActivo === estado) {
      filtroActivo = null;
      $stats.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      $grupos.forEach((g) => { g.hidden = false; });
      // Re-render para que respete los grupos vacíos
      renderTodo();
      return;
    }

    filtroActivo = estado;
    $stats.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    $grupos.forEach((g) => {
      g.hidden = g.dataset.status !== estado;
    });
  });
});

// ============================================================
// INICIALIZAR
// ============================================================
// TODO backend: cuando el API esté listo:
//   import { api } from '../../../services/apiClient.js';
//   const tareas = await api.get('/assignments');
//   ...
tareas = cargarAsignaciones();
renderTodo();