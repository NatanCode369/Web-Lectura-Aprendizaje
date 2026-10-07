import '../../../../utils/analytics.js';
/* Actividad: short_answer — Dueño: Omar */

import {
  loadActivityContext,
  submitAttempt,
  showActivityError,
  showActivitySuccess,
} from "./shared.js";

const $body = document.getElementById("body");

const state = {
  studentAssignment: null,
  activity: null,
  startTime: Date.now(),
};

function render() {
  $body.innerHTML = `
    <p class="activity__question">${state.activity.prompt}</p>
    <div class="short-answer">
      <textarea
        id="answer-input"
        class="short-answer__input"
        rows="5"
        maxlength="500"
        placeholder="Escribe tu respuesta aquí..."
        aria-label="Tu respuesta"
      ></textarea>
      <p class="short-answer__counter" id="counter">0 / 500</p>
    </div>
    <div class="feedback" id="feedback" hidden></div>
    <button class="btn btn--primary" id="submit-btn" disabled>
      Enviar respuesta
    </button>
  `;

  const $input = document.getElementById("answer-input");
  const $counter = document.getElementById("counter");
  const $submit = document.getElementById("submit-btn");

  $input.addEventListener("input", () => {
    $counter.textContent = `${$input.value.length} / 500`;
    $submit.disabled = $input.value.trim().length === 0;
  });

  $input.focus();

  $submit.addEventListener("click", () => submitAnswer($input.value.trim()));
}

async function submitAnswer(answer) {
  const $submit = document.getElementById("submit-btn");
  const $feedback = document.getElementById("feedback");

  $submit.disabled = true;
  $submit.textContent = "Enviando...";

  try {
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    await submitAttempt(
      state.studentAssignment,
      state.activity.activityId,
      { text: answer },
      timeSpent,
    );

    showActivitySuccess(
      $body,
      {
        title: "¡Respuesta enviada!",
        score: 1,
        total: 1,
        message: "Tu respuesta se guardó correctamente.",
      },
      state.studentAssignment._id,
    );
  } catch (error) {
    console.error("[short-answer] Error al enviar:", error);

    $feedback.textContent = "No pudimos enviar tu respuesta. Intenta de nuevo.";
    $feedback.className = "feedback feedback--error";
    $feedback.hidden = false;

    $submit.disabled = false;
    $submit.textContent = "Enviar respuesta";
  }
}

async function init() {
  try {
    const { studentAssignment, activity } = await loadActivityContext();
    state.studentAssignment = studentAssignment;
    state.activity = activity;
    render();
  } catch (error) {
    console.error("[short-answer] Error:", error);
    showActivityError(
      $body,
      error.message || "No pudimos cargar la actividad.",
    );
  }
}

init();
