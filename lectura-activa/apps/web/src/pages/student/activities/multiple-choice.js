import '../../../../utils/analytics.js';
/* Actividad: multiple_choice — Dueño: Omar */

import {
  loadActivityContext,
  submitAttempt,
  goBackToReading,
  showActivityError,
  showActivitySuccess,
} from "./shared.js";

const $body = document.getElementById("body");
const $progress = document.getElementById("progress");

const state = {
  studentAssignment: null,
  activity: null,
  questions: [],
  current: 0,
  score: 0,
  startTime: Date.now(),
};

function render() {
  const item = state.questions[state.current];
  $progress.textContent = `${state.current + 1} / ${state.questions.length}`;

  $body.innerHTML = `
    <p class="activity__question">${item.prompt}</p>
    <div class="options" id="options">
      ${item.options
        .map(
          (opt, i) => `
        <button class="option" data-index="${i}">${opt}</button>
      `,
        )
        .join("")}
    </div>
    <div class="feedback" id="feedback" hidden></div>
    <button class="btn btn--primary" id="next" hidden>Siguiente →</button>
  `;

  document.querySelectorAll(".option").forEach((btn) => {
    btn.addEventListener("click", () =>
      selectOption(Number(btn.dataset.index)),
    );
  });

  document.getElementById("next").addEventListener("click", () => {
    state.current++;
    if (state.current < state.questions.length) render();
    else finish();
  });
}

function selectOption(index) {
  const item = state.questions[state.current];
  const buttons = document.querySelectorAll(".option");
  buttons.forEach((b) => (b.disabled = true));

  /* Nota: no sabemos la respuesta correcta (el backend la guarda).
     Solo mostramos qué eligió el estudiante. El backend puntúa. */
  buttons[index].classList.add("option--selected");

  const $feedback = document.getElementById("feedback");
  $feedback.textContent = "Respuesta guardada";
  $feedback.className = "feedback feedback--ok";
  $feedback.hidden = false;

  document.getElementById("next").hidden = false;
}

async function finish() {
  try {
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
    const answers = { choice: state.questions[state.current - 1]?.selected };

    /* Enviar al backend */
    await submitAttempt(
      state.studentAssignment,
      state.activity.activityId,
      { choice: state.questions.map((q) => q.selected) },
      timeSpent,
    );

    showActivitySuccess(
      $body,
      {
        title: "¡Actividad enviada!",
        score: state.questions.length,
        total: state.questions.length,
        message: "Tus respuestas se guardaron correctamente.",
      },
      state.studentAssignment._id,
    );
  } catch (error) {
    console.error("[multiple-choice] Error al enviar:", error);
    showActivityError($body, "No pudimos enviar tus respuestas.");
  }
}

async function init() {
  try {
    const { studentAssignment, activity } = await loadActivityContext();
    state.studentAssignment = studentAssignment;
    state.activity = activity;

    const options = activity.options || activity.config?.options || [];
    state.questions = [
      {
        prompt: activity.prompt,
        options,
        selected: null,
      },
    ];

    render();
  } catch (error) {
    console.error("[multiple-choice] Error:", error);
    showActivityError(
      $body,
      error.message || "No pudimos cargar la actividad.",
    );
  }
}

init();
