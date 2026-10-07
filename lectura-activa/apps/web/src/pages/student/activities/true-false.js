import '../../../../utils/analytics.js';
/* Actividad: true_false — Dueño: Omar */

import {
  loadActivityContext,
  submitAttempt,
  showActivityError,
  showActivitySuccess,
} from "./shared.js";

const $body = document.getElementById("body");
const $progress = document.getElementById("progress");

const state = {
  studentAssignment: null,
  activity: null,
  answer: null,
  startTime: Date.now(),
};

function render() {
  $progress.textContent = "1 / 1";

  $body.innerHTML = `
    <div class="swipe-card" id="card">
      <p class="swipe-card__text">${state.activity.prompt}</p>
      <span class="swipe-card__hint">← Falso | Verdadero →</span>
    </div>
    <div class="swipe-actions">
      <button class="btn btn--danger" id="false-btn">← Falso</button>
      <button class="btn btn--primary" id="true-btn">Verdadero →</button>
    </div>
  `;

  document
    .getElementById("true-btn")
    .addEventListener("click", () => answer(true));
  document
    .getElementById("false-btn")
    .addEventListener("click", () => answer(false));
}

async function answer(value) {
  state.answer = value;

  try {
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    await submitAttempt(
      state.studentAssignment,
      state.activity.activityId,
      { choice: value },
      timeSpent,
    );

    showActivitySuccess(
      $body,
      {
        title: "¡Actividad enviada!",
        score: 1,
        total: 1,
        message: `Respondiste: ${value ? "Verdadero" : "Falso"}.`,
      },
      state.studentAssignment._id,
    );
  } catch (error) {
    console.error("[true-false] Error al enviar:", error);
    showActivityError($body, "No pudimos enviar tu respuesta.");
  }
}

async function init() {
  try {
    const { studentAssignment, activity } = await loadActivityContext();
    state.studentAssignment = studentAssignment;
    state.activity = activity;
    render();
  } catch (error) {
    console.error("[true-false] Error:", error);
    showActivityError(
      $body,
      error.message || "No pudimos cargar la actividad.",
    );
  }
}

init();
