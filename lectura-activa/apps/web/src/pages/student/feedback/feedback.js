/**
 * feedback.js
 * Muestra los resultados de una lectura completada.
 * Por ahora usa datos mock. Mañana se conecta a GET /api/v1/assignments/:id.
 */

// ============================================================
// DATOS MOCK
// ============================================================
// TODO backend: reemplazar por:
//   import { api } from '../../../services/apiClient.js';
//   const data = await api.get(`/assignments/${id}`);
const FEEDBACK_MOCK = {
  fake_001: {
    readingTitle: 'El principito',
    score: 92,
    timeSpentSeconds: 720,
    completedAt: '2026-09-22T10:15:00Z',
    activities: [
      {
        prompt: '¿Quién es el protagonista de la historia?',
        answer: 'El principito',
        correctAnswer: 'El principito',
        isCorrect: true
      },
      {
        prompt: '¿De dónde viene el principito?',
        answer: 'De la Tierra',
        correctAnswer: 'De otro planeta',
        isCorrect: false,
        feedback: 'El principito viene del asteroide B-612, un planeta muy pequeño donde vivía solo con una rosa.'
      },
      {
        prompt: '¿Qué le enseña el principito al piloto?',
        answer: 'Sobre el amor y la amistad',
        correctAnswer: 'Sobre el amor y la amistad',
        isCorrect: true
      }
    ]
  }
};

// ============================================================
// REFERENCIAS
// ============================================================
const $ = (id) => document.getElementById(id);
const $loading = $('loading-state');
const $error = $('error-state');
const $content = $('feedback-content');

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

function nivelProgreso(score) {
  if (score >= 80) return '';
  if (score >= 60) return 'feedback__progress-fill--mid';
  return 'feedback__progress-fill--low';
}

function motivacion(score) {
  if (score >= 90) return '¡Excelente trabajo! Dominas esta lectura.';
  if (score >= 70) return '¡Muy bien! Vas por buen camino.';
  if (score >= 50) return 'Buen intento. Repasa las respuestas incorrectas.';
  return 'No te desanimes. Revisa la lectura con calma.';
}

function mostrarSoloCargando() {
  $loading.hidden = false;
  $error.hidden = true;
  $content.hidden = true;
}

function mostrarSoloError(mensaje) {
  $loading.hidden = true;
  $error.hidden = false;
  $content.hidden = true;
  document.querySelector('[data-field="errorMessage"]').textContent = mensaje;
}

function mostrarSoloContenido() {
  $loading.hidden = true;
  $error.hidden = true;
  $content.hidden = false;
}

function llenar(campo, valor) {
  const el = document.querySelector(`[data-field="${campo}"]`);
  if (el) el.textContent = valor;
}

// ============================================================
// RENDER
// ============================================================
function renderActividades(actividades) {
  const $lista = document.querySelector('[data-field="activitiesList"]');

  $lista.innerHTML = actividades.map((a) => {
    if (a.isCorrect) {
      return `
        <li class="feedback__activity feedback__activity--correct">
          <header class="feedback__activity-header">
            <span class="feedback__activity-status" aria-hidden="true">✅</span>
            <h3 class="feedback__activity-title">${escapeHtml(a.prompt)}</h3>
          </header>
          <div class="feedback__activity-body">
            <p class="feedback__activity-answer">
              <strong>Tu respuesta:</strong>
              <span>${escapeHtml(a.answer)}</span>
            </p>
            <p class="feedback__activity-result feedback__activity-result--correct">
              <span aria-hidden="true">✓</span>
              Correcto
            </p>
          </div>
        </li>
      `;
    }

    return `
      <li class="feedback__activity feedback__activity--wrong">
        <header class="feedback__activity-header">
          <span class="feedback__activity-status" aria-hidden="true">❌</span>
          <h3 class="feedback__activity-title">${escapeHtml(a.prompt)}</h3>
        </header>
        <div class="feedback__activity-body">
          <p class="feedback__activity-answer">
            <strong>Tu respuesta:</strong>
            <span>${escapeHtml(a.answer)}</span>
          </p>
          <p class="feedback__activity-answer feedback__activity-answer--correct">
            <strong>Respuesta correcta:</strong>
            <span>${escapeHtml(a.correctAnswer)}</span>
          </p>
          ${a.feedback ? `
            <div class="feedback__activity-feedback">
              <span class="feedback__activity-feedback-icon" aria-hidden="true">💬</span>
              <p class="feedback__activity-feedback-text">${escapeHtml(a.feedback)}</p>
            </div>
          ` : ''}
        </div>
      </li>
    `;
  }).join('');
}

function render(data) {
  document.title = `Resultados: ${data.readingTitle} — Lectura Activa`;

  llenar('readingTitle', data.readingTitle);
  llenar('score', data.score);
  llenar('timeSpent', formatearTiempo(data.timeSpentSeconds));
  llenar('completedAt', formatearFecha(data.completedAt));
  llenar('motivation', motivacion(data.score));

  const correctas = data.activities.filter((a) => a.isCorrect).length;
  llenar('correctCount', correctas);
  llenar('totalCount', data.activities.length);

  // Barra de progreso
  const $barra = document.querySelector('[data-field="scoreProgressBar"]');
  const $fill = document.querySelector('[data-field="scoreProgressFill"]');
  if ($barra) $barra.setAttribute('aria-valuenow', data.score);
  if ($fill) {
    $fill.style.width = `${data.score}%`;
    $fill.className = `feedback__progress-fill ${nivelProgreso(data.score)}`;
  }

  renderActividades(data.activities);
}

// ============================================================
// CARGA
// ============================================================
async function cargarFeedback() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    mostrarSoloError('No especificaste qué resultados ver.');
    return;
  }

  mostrarSoloCargando();
  await new Promise((r) => setTimeout(r, 500));

  // TODO backend: reemplazar por:
  //   try {
  //     const data = await api.get(`/assignments/${id}`);
  //     render(data);
  //     mostrarSoloContenido();
  //   } catch (err) {
  //     if (err.status === 401) { window.location.href = '../../auth/login.html'; return; }
  //     mostrarSoloError(err.message || 'Error al cargar.');
  //   }

  const data = FEEDBACK_MOCK[id];
  if (!data) {
    mostrarSoloError('Resultados no encontrados.');
    return;
  }

  render(data);
  mostrarSoloContenido();
}

cargarFeedback();