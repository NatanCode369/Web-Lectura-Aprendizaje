/**
 * my-tasks.js
 * Muestra las tareas asignadas al estudiante.
 * Por ahora usa datos mock. Mañana se conecta a GET /api/v1/assignments.
 */

// ============================================================
// DATOS MOCK
// ============================================================
// TODO backend: reemplazar por:
//   import { api } from '../../../services/apiClient.js';
//   const tareas = await api.get('/assignments');
const TAREAS_MOCK = [
  {
    id: 'fake_001',
    readingTitle: 'El principito',
    readingSummary: 'Un piloto conoce a un pequeño príncipe que viene de otro planeta y le enseña lecciones sobre la vida, el amor y la amistad.',
    groupName: '3°A',
    estimatedMinutes: 15,
    status: 'pending',
    dueAt: '2026-10-15T18:00:00Z'
  },
  {
    id: 'fake_002',
    readingTitle: '1984',
    readingSummary: 'Una distopía sobre un régimen totalitario que controla todo, incluso el pensamiento, y la lucha de un hombre por la libertad.',
    groupName: '3°A',
    estimatedMinutes: 45,
    status: 'pending',
    dueAt: '2026-10-20T23:59:00Z'
  },
  {
    id: 'fake_003',
    readingTitle: 'La casa de los espíritus',
    readingSummary: 'La saga de la familia Trueba a lo largo de varias generaciones, con elementos mágicos y políticos.',
    groupName: '3°A',
    estimatedMinutes: 40,
    status: 'pending',
    dueAt: '2026-10-25T18:00:00Z'
  },
  {
    id: 'fake_004',
    readingTitle: 'Don Quijote de la Mancha',
    readingSummary: 'Las aventuras de un hidalgo que decide convertirse en caballero andante y vive todo tipo de peripecias.',
    groupName: '3°A',
    estimatedMinutes: 60,
    status: 'in_progress',
    dueAt: '2026-10-25T23:59:00Z'
  },
  {
    id: 'fake_005',
    readingTitle: 'Cien años de soledad',
    readingSummary: 'La historia de la familia Buendía en el pueblo de Macondo, con realismo mágico y personajes inolvidables.',
    groupName: '3°A',
    estimatedMinutes: 30,
    status: 'completed',
    completedAt: '2026-09-28T14:30:00Z',
    score: 85
  },
  {
    id: 'fake_006',
    readingTitle: 'El Principito (corto)',
    readingSummary: 'Versión corta para lectores principiantes del clásico de Saint-Exupéry.',
    groupName: '3°A',
    estimatedMinutes: 8,
    status: 'completed',
    completedAt: '2026-09-22T10:15:00Z',
    score: 92
  }
];

// ============================================================
// REFERENCIAS
// ============================================================
const $grupos = document.querySelectorAll('.tasks__group');
const $stats = document.querySelectorAll('.tasks__stat');
const $vacio = document.querySelector('.tasks__empty');

let filtroActivo = null;

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

function contarPorEstado(estado) {
  return TAREAS_MOCK.filter((t) => t.status === estado).length;
}

// ============================================================
// RENDER
// ============================================================
function crearTarjeta(t) {
  const esPending = t.status === 'pending';
  const esInProgress = t.status === 'in_progress';
  const esCompleted = t.status === 'completed';

  const statusIcon = esPending ? '●' : esInProgress ? '◐' : '✓';
  const statusClass = `task-card__status--${t.status}`;

  const href = esCompleted
    ? `../feedback/feedback.html?id=${t.id}`
    : `../reading-activity/reading-activity.html?id=${t.id}`;

  const dueHTML = esCompleted
    ? `<span class="task-card__score">${t.score} / 100</span>`
    : `<span class="task-card__due ${estaProximaAVencer(t.dueAt) ? 'task-card__due--soon' : ''}">Vence: ${formatearFecha(t.dueAt)}</span>`;

  const metaHTML = esCompleted
    ? `<span class="task-card__completed-date">Completada el ${formatearFecha(t.completedAt)}</span>`
    : `<span class="task-card__minutes"><span aria-hidden="true">⏱</span> ${t.estimatedMinutes} min</span>`;

  const actionText = esCompleted
    ? 'Ver resultados'
    : esInProgress
      ? 'Continuar leyendo'
      : 'Empezar a leer';

  return `
    <li>
      <a href="${href}" class="task-card task-card--${t.status}" data-id="${escapeHtml(t.id)}">
        <div class="task-card__header">
          <span class="task-card__status ${statusClass}" aria-hidden="true">${statusIcon}</span>
          <h3 class="task-card__title">${escapeHtml(t.readingTitle)}</h3>
          ${dueHTML}
        </div>
        <p class="task-card__summary">${escapeHtml(t.readingSummary)}</p>
        <div class="task-card__meta">
          <span class="task-card__group">Grupo: ${escapeHtml(t.groupName)}</span>
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

function renderGrupo(estado) {
  const tareas = TAREAS_MOCK.filter((t) => t.status === estado);
  const $grupo = document.querySelector(`.tasks__group[data-status="${estado}"]`);
  if (!$grupo) return;

  const $lista = $grupo.querySelector('.tasks__group-list');
  const $count = $grupo.querySelector('.tasks__group-count');

  $count.textContent = tareas.length;

  if (tareas.length === 0) {
    $grupo.hidden = true;
    return;
  }

  $grupo.hidden = false;
  $lista.innerHTML = tareas.map(crearTarjeta).join('');
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
  if (TAREAS_MOCK.length === 0) {
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

    // Si ya estaba activo, desactivar
    if (filtroActivo === estado) {
      filtroActivo = null;
      $stats.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      $grupos.forEach((g) => { g.hidden = false; });
      return;
    }

    // Activar este filtro
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
//   try {
//     const tareas = await api.get('/assignments');
//     TAREAS_MOCK.length = 0;
//     TAREAS_MOCK.push(...tareas);
//     renderTodo();
//   } catch (err) {
//     if (err.status === 401) window.location.href = '../../auth/login.html';
//     else console.error('Error:', err);
//   }

renderTodo();