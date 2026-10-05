/* Actividad: matching — Dueño: Omar */

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
  pairs: [],
  matches: [],
  currentLeft: null,
  startTime: Date.now(),
};

function render() {
  const lefts = state.pairs.map((p) => p.left);
  const rights = state.pairs.map((p) => p.right);
  const shuffledRights = [...rights].sort(() => Math.random() - 0.5);

  $body.innerHTML = `
    <p class="activity__hint">Une cada concepto con su pareja correcta.</p>
    <div class="mind-map">
      <div class="mind-map__col">
        ${lefts
          .map(
            (text, i) => `
          <div class="mind-map__node" data-side="left" data-index="${i}">${text}</div>
        `,
          )
          .join("")}
      </div>
      <div class="mind-map__col">
        ${shuffledRights
          .map(
            (text, i) => `
          <div class="mind-map__node" data-side="right" data-text="${text}">${text}</div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  $body.querySelectorAll(".mind-map__node").forEach((node) => {
    node.addEventListener("click", () => handleClick(node));
  });
}

function handleClick(node) {
  const side = node.dataset.side;

  if (side === "left") {
    if (state.currentLeft) state.currentLeft.classList.remove("is-selected");
    state.currentLeft = node;
    node.classList.add("is-selected");
    return;
  }

  if (!state.currentLeft) return;

  /* Verificar si hace match */
  const leftIndex = Number(state.currentLeft.dataset.index);
  const rightText = node.dataset.text;
  const correctRight = state.pairs[leftIndex].right;

  if (rightText === correctRight) {
    state.currentLeft.classList.remove("is-selected");
    state.currentLeft.classList.add("is-matched");
    node.classList.add("is-matched");
    state.matches.push({ left: state.pairs[leftIndex].left, right: rightText });
  } else {
    state.currentLeft.classList.remove("is-selected");
  }

  state.currentLeft = null;

  $progress.textContent = `${state.matches.length} / ${state.pairs.length}`;

  if (state.matches.length === state.pairs.length) {
    finish();
  }
}

async function finish() {
  try {
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    await submitAttempt(
      state.studentAssignment,
      state.activity.activityId,
      { matches: state.matches },
      timeSpent,
    );

    showActivitySuccess(
      $body,
      {
        title: "¡Todas las parejas encontradas!",
        score: state.matches.length,
        total: state.pairs.length,
        message: "Tu actividad se envió correctamente.",
      },
      state.studentAssignment._id,
    );
  } catch (error) {
    console.error("[matching] Error al enviar:", error);
    showActivityError($body, "No pudimos enviar tu actividad.");
  }
}

async function init() {
  try {
    const { studentAssignment, activity } = await loadActivityContext();
    state.studentAssignment = studentAssignment;
    state.activity = activity;

    state.pairs = activity.pairs || activity.config?.pairs || [];
    $progress.textContent = `0 / ${state.pairs.length}`;
    render();
  } catch (error) {
    console.error("[matching] Error:", error);
    showActivityError(
      $body,
      error.message || "No pudimos cargar la actividad.",
    );
  }
}

init();
