/**
 * reading-detail.js
 * Muestra el detalle de una lectura.
 * Por ahora usa datos mock. Mañana se conecta a GET /api/v1/readings/:id.
 */

// ============================================================
// DATOS MOCK
// ============================================================
// TODO backend: reemplazar por:
//   import { api } from '../../../services/apiClient.js';
//   const reading = await api.get(`/readings/${readingId}`);
const LECTURAS_MOCK = {
  fake_001: {
    id: 'fake_001',
    title: 'El principito',
    authorName: 'Ana López',
    summary: 'Un piloto conoce a un pequeño príncipe que viene de otro planeta y le enseña lecciones sobre la vida, el amor y la amistad. A través de sus conversaciones, el principito comparte su visión única del mundo y ayuda al piloto a redescubrir lo esencial que muchas veces olvidamos los adultos.',
    difficulty: 'easy',
    estimatedMinutes: 15,
    activities: [
      { type: 'trivia', title: 'Preguntas de comprensión', text: 'Responde preguntas sobre los personajes y la historia.' },
      { type: 'true_false', title: 'Verdadero o falso', text: 'Identifica si las afirmaciones son verdaderas o falsas.' },
      { type: 'detective', title: 'Detective de palabras', text: 'Encuentra sinónimos en el texto.' }
    ]
  },
  fake_002: {
    id: 'fake_002',
    title: '1984',
    authorName: 'Luis Pérez',
    summary: 'Una distopía sobre un régimen totalitario que controla todo, incluso el pensamiento, y la lucha de un hombre por la libertad.',
    difficulty: 'hard',
    estimatedMinutes: 45,
    activities: [
      { type: 'trivia', title: 'Preguntas de comprensión', text: 'Responde sobre el mundo de Oceanía.' },
      { type: 'true_false', title: 'Verdadero o falso', text: 'Afirmaciones sobre la historia.' }
    ]
  },
  fake_003: {
    id: 'fake_003',
    title: 'Cien años de soledad',
    authorName: 'Gabriel García Márquez',
    summary: 'La historia de la familia Buendía en el pueblo de Macondo, con realismo mágico y personajes inolvidables.',
    difficulty: 'medium',
    estimatedMinutes: 30,
    activities: [
      { type: 'trivia', title: 'Preguntas de comprensión', text: 'Responde sobre los Buendía.' },
      { type: 'mind_map', title: 'Mapa mental', text: 'Conecta los personajes con sus historias.' }
    ]
  }
};

const ETIQUETA_DIFICULTAD = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' };
const ETIQUETA_NIVEL = { easy: 'Principiante', medium: 'Intermedio', hard: 'Avanzado' };
const ICONO_ACTIVIDAD = {
  trivia: '❓',
  true_false: '✓',
  detective: '🔍',
  order: '🔀',
  mind_map: '🧠'
};

// ============================================================
// REFERENCIAS
// ============================================================
const $ = (id) => document.getElementById(id);
const $loading = $('loading-state');
const $error = $('error-state');
const $content = $('detail-content');

// ============================================================
// UTILIDADES
// ============================================================
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

function llenarCampo(campo, valor) {
  const el = document.querySelector(`[data-field="${campo}"]`);
  if (el) el.textContent = valor;
}

// ============================================================
// RENDER
// ============================================================
function renderLectura(reading) {
  // Título de la pestaña
  document.title = `${reading.title} — Lectura Activa`;

  // Cabecera
  llenarCampo('title', reading.title);
  llenarCampo('author', `Por: ${reading.authorName}`);
  llenarCampo('breadcrumbTitle', reading.title);

  // Dificultad (texto + clase)
  const $dif = document.querySelector('[data-field="difficulty"]');
  $dif.textContent = ETIQUETA_DIFICULTAD[reading.difficulty] || '—';
  $dif.className = `detail__difficulty detail__difficulty--${reading.difficulty}`;

  // Meta
  llenarCampo('estimatedMinutes', `${reading.estimatedMinutes} min`);
  llenarCampo('activitiesCount', reading.activities.length);
  llenarCampo('level', ETIQUETA_NIVEL[reading.difficulty] || '—');

  // Resumen
  llenarCampo('summary', reading.summary);

  // Lista de actividades
  const $lista = document.querySelector('[data-field="activities"]');
  $lista.innerHTML = reading.activities.map((a) => `
    <li class="detail__activity">
      <span class="detail__activity-icon" aria-hidden="true">${ICONO_ACTIVIDAD[a.type] || '📝'}</span>
      <div class="detail__activity-content">
        <h3 class="detail__activity-title">${a.title}</h3>
        <p class="detail__activity-text">${a.text}</p>
      </div>
    </li>
  `).join('');

  // CTA
  const cta = document.querySelector('[data-field="ctaPrimary"]');
  cta.href = `../reading-activity/reading-activity.html?id=${encodeURIComponent(reading.id)}`;
  llenarCampo('ctaPrimaryText', 'Empezar a leer');
  llenarCampo('ctaNote', 'Una vez empieces, podrás pausar y continuar cuando quieras.');
}

// ============================================================
// CARGA
// ============================================================
async function cargarLectura() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    mostrarSoloError('No especificaste qué lectura abrir.');
    return;
  }

  mostrarSoloCargando();

  // Simulamos un fetch con delay para ver el skeleton
  await new Promise((r) => setTimeout(r, 600));

  // TODO backend: reemplazar por la llamada real:
  //   const reading = await api.get(`/readings/${id}`);
  const reading = LECTURAS_MOCK[id];

  if (!reading) {
    mostrarSoloError('Lectura no encontrada.');
    return;
  }

  renderLectura(reading);
  mostrarSoloContenido();
}

// ============================================================
// INICIALIZAR
// ============================================================
cargarLectura();