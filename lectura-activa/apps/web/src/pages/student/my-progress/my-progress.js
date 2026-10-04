/**
 * my-progress.js
 * Muestra el progreso histórico del estudiante.
 * Por ahora usa datos mock. Mañana se conecta a GET /api/v1/me/progress.
 */

// ============================================================
// DATOS MOCK
// ============================================================
// TODO backend: reemplazar por:
//   import { api } from '../../../services/apiClient.js';
//   const progreso = await api.get('/me/progress');
const PROGRESO_MOCK = {
  totalReadings: 8,
  completedReadings: 5,
  averageScore: 82,
  totalTimeSeconds: 9000,
  history: [
    { id: 'fake_001', readingTitle: 'El principito', score: 92, completedAt: '2026-09-22T10:15:00Z', timeSpentSeconds: 720, groupName: '3°A' },
    { id: 'fake_002', readingTitle: '1984', score: 78, completedAt: '2026-09-15T16:20:00Z', timeSpentSeconds: 2100, groupName: '3°A' },
    { id: 'fake_003', readingTitle: 'Cien años de soledad', score: 85, completedAt: '2026-08-28T11:00:00Z', timeSpentSeconds: 1680, groupName: '3°A' },
    { id: 'fake_004', readingTitle: 'La casa de los espíritus', score: 72, completedAt: '2026-08-20T09:30:00Z', timeSpentSeconds: 2280, groupName: '3°A' },
    { id: 'fake_005', readingTitle: 'Don Quijote de la Mancha', score: 58, completedAt: '2026-08-10T15:45:00Z', timeSpentSeconds: 3300, groupName: '3°A' }
  ]
};

// ============================================================
// REFERENCIAS
// ============================================================
const $seccionHistorial = document.querySelector('.progress__section');
const $vacio = document.querySelector('.progress__empty');

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
  return `${dia}/${mes}/${year}`;
}

function formatearTiempo(segundos) {
  if (!segundos) return '0 min';
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function nivelScore(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}

function llenarTodos(campo, valor) {
  document.querySelectorAll(`[data-field="${campo}"]`).forEach((el) => {
    el.textContent = valor;
  });
}

// ============================================================
// RENDER
// ============================================================
function renderEstadisticas(p) {
  llenarTodos('totalReadings', p.totalReadings);
  llenarTodos('completedReadings', p.completedReadings);
  llenarTodos('averageScore', p.averageScore);
  llenarTodos('totalTime', formatearTiempo(p.totalTimeSeconds));
  llenarTodos('historyCount', p.history.length);
}

function renderHistorial(historial) {
  const $lista = document.querySelector('[data-field="historyList"]');

  $lista.innerHTML = historial.map((item) => `
    <li>
      <a href="../feedback/feedback.html?id=${encodeURIComponent(item.id)}"
         class="progress__item"
         data-id="${escapeHtml(item.id)}">
        <div class="progress__item-header">
          <h3 class="progress__item-title">${escapeHtml(item.readingTitle)}</h3>
          <span class="progress__item-score progress__item-score--${nivelScore(item.score)}">
            ${item.score} / 100
          </span>
        </div>
        <div class="progress__item-meta">
          <span class="progress__item-date">
            <span aria-hidden="true">📅</span>
            ${formatearFecha(item.completedAt)}
          </span>
          <span class="progress__item-time">
            <span aria-hidden="true">⏱</span>
            ${formatearTiempo(item.timeSpentSeconds)}
          </span>
        </div>
        <div class="progress__item-footer">
          <span class="progress__item-group">
            <span aria-hidden="true">👥</span>
            Grupo ${escapeHtml(item.groupName)}
          </span>
          <span class="progress__item-action">
            Ver resultados
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </a>
    </li>
  `).join('');
}

// ============================================================
// INICIALIZAR
// ============================================================
async function cargarProgreso() {
  // TODO backend: reemplazar por:
  //   try {
  //     const p = await api.get('/me/progress');
  //     // render...
  //   } catch (err) {
  //     if (err.status === 401) window.location.href = '../../auth/login.html';
  //   }

  await new Promise((r) => setTimeout(r, 400));

  const p = PROGRESO_MOCK;

  renderEstadisticas(p);

  if (p.history.length === 0) {
    $seccionHistorial.hidden = true;
    $vacio.hidden = false;
  } else {
    $seccionHistorial.hidden = false;
    $vacio.hidden = true;
    renderHistorial(p.history);
  }
}

cargarProgreso();