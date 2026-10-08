import '../../../utils/analytics.js';
/* Actividad: detective — Dueño: Omar */

import {
  loadActivityContext,
  submitAttempt,
  showActivityError,
  showActivitySuccess,
} from "./shared.js";

const $body = document.getElementById("body");
const $timer = document.getElementById("timer");

const state = {
  studentAssignment: null,
  activity: null,
  target: "",
  synonyms: [],
  distractors: [],
  words: [],
  found: 0,
  timeLeft: 60,
  terminado: false,
  interval: null,
  startTime: Date.now(),
};

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  $body.innerHTML = `
    <p class="activity__hint">
      Encuentra sinónimos de: <strong>${state.target}</strong>
    </p>
    <div class="word-grid" id="grid">
      ${state.words.map((w) => `<span class="word">${w}</span>`).join("")}
    </div>
  `;

  document.querySelectorAll(".word").forEach((word) => {
    word.addEventListener("click", () => handleClick(word));
  });
}

function handleClick(word) {
  if (state.terminado) return;
  if (word.classList.contains("is-found")) return;
  if (word.classList.contains("is-wrong")) return;

  const texto = word.textContent;

  if (state.synonyms.includes(texto)) {
    word.classList.add("is-found");
    state.found++;
    if (state.found === state.synonyms.length) {
      clearInterval(state.interval);
      finish();
    }
  } else {
    word.classList.add("is-wrong");
  }
}

/* ============================================================
   TIMER
   ============================================================ */
function startTimer() {
  state.timeLeft = 60;
  if ($timer) $timer.textContent = `⏱ ${state.timeLeft}s`;

  state.interval = setInterval(() => {
    state.timeLeft--;
    if ($timer) $timer.textContent = `⏱ ${state.timeLeft}s`;
    if (state.timeLeft <= 0) {
      clearInterval(state.interval);
      finish();
    }
  }, 1000);
}

/* ============================================================
   FIN
   ============================================================ */
async function finish() {
  if (state.terminado) return;
  state.terminado = true;

  const puntaje = state.found;
  const total = state.synonyms.length;

  try {
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    await submitAttempt(
      state.studentAssignment,
      state.activity.activityId,
      { found: puntaje, total },
      timeSpent
    );

    showActivitySuccess(
      $body,
      {
        title: "¡Tiempo terminado!",
        score: puntaje,
        total,
        message: `Encontraste ${puntaje} sinónimos.`,
      },
      state.studentAssignment._id
    );
  } catch (error) {
    console.error("[detective] Error al enviar:", error);
    showActivityError($body, "No pudimos enviar tu actividad.");
  }
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  try {
    const { studentAssignment, activity } = await loadActivityContext();
    state.studentAssignment = studentAssignment;
    state.activity = activity;

    const config = activity.config || {};

    state.target = config.target || activity.target || "velocidad";
    state.synonyms = config.synonyms || activity.synonyms || [
      "rapidez",
      "celeridad",
      "prisa",
      "agilidad",
      "ligereza",
    ];
    state.distractors = config.distractors || activity.distractors || [
      "lentitud",
      "calma",
      "pausa",
      "tranquilidad",
    ];

    // Mezclar sinónimos + distractores
    state.words = [...state.synonyms, ...state.distractors].sort(
      () => Math.random() - 0.5
    );

    state.startTime = Date.now();
    render();
    startTimer();
  } catch (error) {
    console.error("[detective] Error:", error);
    showActivityError(
      $body,
      error.message || "No pudimos cargar la actividad."
    );
  }
}

init();