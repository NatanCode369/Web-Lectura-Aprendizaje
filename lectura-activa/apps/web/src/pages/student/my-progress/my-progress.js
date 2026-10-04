/**
 * my-progress.js
 * Muestra el progreso histórico del estudiante basado en los resultados
 * guardados en localStorage (resultado_${lecturaId}).
 * 
 * TODO backend: reemplazar por GET /api/v1/me/progress
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const ESTUDIANTE_EMAIL = 'estudiante@kinal.edu.gt'; // TODO: reemplazar con user.email real

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
// CÁLCULO DE PUNTAJE
// ============================================================
/**
 * Calcula el puntaje de una lectura completada.
 * Compara las respuestas del estudiante con las correctas.
 */
function calcularScore(lecturaId, resultado) {
  const actividadesGuardadas = localStorage.getItem(`actividades_${lecturaId}`);
  if (!actividadesGuardadas) return 0;

  const acts = JSON.parse(actividadesGuardadas);
  const respuestas = resultado.respuestas || {};

  let correctas = 0;
  let total = 0;

  // Trivia
  (acts.trivia || []).forEach((q, i) => {
    const idx = String(i);
    total++;
    if (respuestas[idx] === q.correcta) correctas++;
  });

  // Verdadero / Falso
  const offset = (acts.trivia || []).length;
  (acts.verdaderoFalso || []).forEach((v, j) => {
    const idx = String(offset + j);
    total++;
    if (respuestas[idx] === v.respuesta) correctas++;
  });

  if (total === 0) return 0;
  return Math.round((correctas / total) * 100);
}

// ============================================================
// CARGAR HISTORIAL
// ============================================================
function cargarHistorial() {
  const historial = [];

  // Buscar todas las claves resultado_* en localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key || !key.startsWith('resultado_')) continue;

    const lecturaId = key.replace('resultado_', '');

    // Leer el resultado guardado
    let resultado;
    try {
      resultado = JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      continue;
    }

    // Leer la lectura (para saber el título)
    const lecturaGuardada = localStorage.getItem(`lectura_${lecturaId}`);
    const lectura = lecturaGuardada ? JSON.parse(lecturaGuardada) : null;

    // Leer el grupo del estudiante (para saber a qué grupo pertenece)
    const grupoGuardado = localStorage.getItem(`grupo_estudiante_${ESTUDIANTE_EMAIL}`);
    const grupo = grupoGuardado ? JSON.parse(grupoGuardado) : null;

    const score = calcularScore(lecturaId, resultado);

    historial.push({
      id: lecturaId,
      readingTitle: lectura?.title || 'Lectura',
      score,
      completedAt: resultado.fecha,
      timeSpentSeconds: resultado.tiempoUsadoSegundos || 0,
      groupName: grupo?.nombreGrupo || 'Sin grupo'
    });
  }

  // Ordenar por fecha descendente (más reciente primero)
  historial.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return historial;
}

// ============================================================
// RENDER
// ============================================================
function renderEstadisticas(historial) {
  const total = historial.length;
  const promedio = total > 0
    ? Math.round(historial.reduce((acc, h) => acc + h.score, 0) / total)
    : 0;
  const tiempoTotal = historial.reduce((acc, h) => acc + h.timeSpentSeconds, 0);

  llenarTodos('totalReadings', total);
  llenarTodos('completedReadings', total);
  llenarTodos('averageScore', promedio);
  llenarTodos('totalTime', formatearTiempo(tiempoTotal));
  llenarTodos('historyCount', total);
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
function init() {
  const historial = cargarHistorial();

  renderEstadisticas(historial);

  if (historial.length === 0) {
    $seccionHistorial.hidden = true;
    $vacio.hidden = false;
  } else {
    $seccionHistorial.hidden = false;
    $vacio.hidden = true;
    renderHistorial(historial);
  }
}

init();