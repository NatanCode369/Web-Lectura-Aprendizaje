/**
 * reading-activity.js
 * Lector con temporizador de lectura y actividades del estudiante.
 * Por ahora usa datos mock desde localStorage.
 * TODO backend: reemplazar localStorage por api.get('/readings/:id').
 */

// ============================================================
// CARGAR LECTURA DESDE LOCALSTORAGE
// ============================================================
const params = new URLSearchParams(window.location.search);
const lecturaId = params.get('id') || 'liebre-tortuga';

const lecturaGuardada = localStorage.getItem(`lectura_${lecturaId}`);
const datosLectura = lecturaGuardada ? JSON.parse(lecturaGuardada) : null;

const reading = {
  title: datosLectura?.title || 'Lectura',
  estimatedMinutes: datosLectura?.estimatedMinutes || 15,
  activities: []
};

// Mostrar título
document.querySelector('[data-field="title"]').textContent = reading.title;
document.title = `${reading.title} — Lectura Activa`;

// ============================================================
// CARGAR ACTIVIDADES DESDE LOCALSTORAGE
// ============================================================
const actividadesGuardadas = localStorage.getItem(`actividades_${lecturaId}`);
const actividadesDocente = actividadesGuardadas ? JSON.parse(actividadesGuardadas) : null;

let actividadesList = [];

if (actividadesDocente) {
  if (actividadesDocente.trivia?.length) {
    actividadesDocente.trivia.forEach(t => {
      if (t.pregunta && t.opciones?.some(o => o)) {
        actividadesList.push({
          type: 'multiple_choice',
          question: t.pregunta,
          options: t.opciones,
          correct: t.correcta
        });
      }
    });
  }
  if (actividadesDocente.verdaderoFalso?.length) {
    actividadesDocente.verdaderoFalso.forEach(v => {
      if (v.afirmacion) {
        actividadesList.push({
          type: 'true_false',
          question: v.afirmacion,
          correct: v.respuesta
        });
      }
    });
  }
}

if (actividadesList.length === 0) {
  actividadesList = [
    { type: 'multiple_choice', question: '¿Quién es el protagonista?', options: ['El piloto', 'El principito', 'La rosa'], correct: 1 }
  ];
}

reading.activities = actividadesList;
reading.timeLimitSeconds = reading.estimatedMinutes * 60;

// ============================================================
// REFERENCIAS
// ============================================================
const $viewReading = document.getElementById('view-reading');
const $viewActivities = document.getElementById('view-activities');
const $viewSummary = document.getElementById('view-summary');

const $timerContainer = document.querySelector('[data-field="timerContainer"]');
const $timer = document.querySelector('[data-field="timer"]');
const $timeExtraNotice = document.getElementById('time-extra-notice');

const $activityContent = document.querySelector('[data-field="activityContent"]');
const $panelCurrent = document.querySelector('[data-field="panelCurrent"]');
const $panelTotal = document.querySelector('[data-field="panelTotal"]');
const $activitiesCount = document.querySelector('[data-field="activitiesCount"]');
const $prevBtn = document.getElementById('activity-prev');
const $nextBtn = document.getElementById('activity-next');
const $submitWrapper = document.querySelector('[data-field="submitWrapper"]');

const $summaryTime = document.querySelector('[data-field="summaryTime"]');
const $summaryAnswers = document.querySelector('[data-field="summaryAnswers"]');
const $goToFeedback = document.getElementById('go-to-feedback');

// ============================================================
// ESTADO
// ============================================================
let remainingTime = reading.timeLimitSeconds;
let intervaloLectura = null;
let avisoMostrado = false;
let tiempoUsado = 0;

let currentActivity = 0;
const answers = {};

$panelTotal.textContent = reading.activities.length;
$activitiesCount.textContent = reading.activities.length;

// ============================================================
// UTILIDADES
// ============================================================
function formatMMSS(segundos) {
  const abs = Math.abs(segundos);
  const mm = String(Math.floor(abs / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');
  return (segundos < 0 ? '-' : '') + `${mm}:${ss}`;
}

function formatDuracion(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  if (min === 0) return `${seg} seg`;
  return `${min} min ${String(seg).padStart(2, '0')} seg`;
}

// ============================================================
// TEMPORIZADOR
// ============================================================
function actualizarTimer() {
  remainingTime--;
  tiempoUsado = reading.timeLimitSeconds - remainingTime;
  $timer.textContent = formatMMSS(remainingTime);

  const pct = remainingTime / reading.timeLimitSeconds;
  $timerContainer.classList.remove('activity__timer--warning', 'activity__timer--danger', 'activity__timer--over');

  if (remainingTime < 0) {
    $timerContainer.classList.add('activity__timer--over');
  } else if (pct <= 0.10) {
    $timerContainer.classList.add('activity__timer--danger');
    if (!avisoMostrado) {
      $timeExtraNotice.hidden = false;
      avisoMostrado = true;
    }
  } else if (pct <= 0.25) {
    $timerContainer.classList.add('activity__timer--warning');
  }

  if (remainingTime <= 0) {
    detenerTimer();
    irAResumen();
  }
}

function empezarTimer() {
  if (intervaloLectura) return;
  intervaloLectura = setInterval(actualizarTimer, 1000);
}

function detenerTimer() {
  if (intervaloLectura) {
    clearInterval(intervaloLectura);
    intervaloLectura = null;
  }
}

// ============================================================
// CAMBIO DE VISTA
// ============================================================
document.getElementById('activities-toggle').addEventListener('click', () => {
  detenerTimer();
  $viewReading.hidden = true;
  $viewActivities.hidden = false;
  currentActivity = 0;
  renderActivity();
});

// ============================================================
// ACTIVIDADES
// ============================================================
function renderActivity() {
  const act = reading.activities[currentActivity];
  $panelCurrent.textContent = currentActivity + 1;

  if (act.type === 'multiple_choice') {
    $activityContent.innerHTML = `
      <div class="activity__question">
        <h3 class="activity__question-text">${act.question}</h3>
        <fieldset class="activity__options">
          ${act.options.map((opt, i) => `
            <label class="activity__option">
              <input type="radio" name="activity-${currentActivity}" value="${i}" ${answers[currentActivity] == i ? 'checked' : ''}>
              <span class="activity__option-text">${opt}</span>
            </label>
          `).join('')}
        </fieldset>
      </div>
    `;
  } else if (act.type === 'true_false') {
    $activityContent.innerHTML = `
      <div class="activity__question">
        <h3 class="activity__question-text">${act.question}</h3>
        <fieldset class="activity__options">
          <label class="activity__option">
            <input type="radio" name="activity-${currentActivity}" value="true" ${answers[currentActivity] === true ? 'checked' : ''}>
            <span class="activity__option-text">Verdadero</span>
          </label>
          <label class="activity__option">
            <input type="radio" name="activity-${currentActivity}" value="false" ${answers[currentActivity] === false ? 'checked' : ''}>
            <span class="activity__option-text">Falso</span>
          </label>
        </fieldset>
      </div>
    `;
  }

  $prevBtn.disabled = currentActivity === 0;
  const isLast = currentActivity === reading.activities.length - 1;
  $nextBtn.hidden = isLast;
  $submitWrapper.hidden = !isLast;

  $activityContent.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const val = input.value;
      answers[currentActivity] = act.type === 'true_false' ? val === 'true' : Number(val);
    });
  });
}

$prevBtn.addEventListener('click', () => {
  if (currentActivity > 0) { currentActivity--; renderActivity(); }
});

$nextBtn.addEventListener('click', () => {
  if (currentActivity < reading.activities.length - 1) { currentActivity++; renderActivity(); }
});

// ============================================================
// ENVÍO Y PANTALLA DE RESUMEN
// ============================================================
document.getElementById('activity-submit').addEventListener('click', () => {
  irAResumen();
});

function irAResumen() {
  localStorage.setItem(`resultado_${lecturaId}`, JSON.stringify({
    respuestas: answers,
    tiempoUsadoSegundos: tiempoUsado,
    fecha: new Date().toISOString()
  }));

  $summaryTime.textContent = formatDuracion(tiempoUsado);

  const respondidas = Object.keys(answers).length;
  $summaryAnswers.textContent = `${respondidas} de ${reading.activities.length}`;

  $goToFeedback.href = `../feedback/feedback.html?id=${encodeURIComponent(lecturaId)}`;

  $viewReading.hidden = true;
  $viewActivities.hidden = true;
  $viewSummary.hidden = false;
}

// ============================================================
// INIT
// ============================================================
$timer.textContent = formatMMSS(remainingTime);
empezarTimer();