/* Actividad: ordering — Dueño: Omar */

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
  items: [],
  startTime: Date.now(),
};

function render() {
  $body.innerHTML = `
    <p class="activity__hint">Arrastra los eventos al orden correcto.</p>
    <ul class="sortable" id="sortable">
      ${state.items
        .map(
          (item) => `
        <li class="sortable__item" draggable="true">${item.text}</li>
      `,
        )
        .join("")}
    </ul>
    <button class="btn btn--primary" id="check">Comprobar orden</button>
  `;

  setupDrag();
  document.getElementById("check").addEventListener("click", finish);
}

function setupDrag() {
  const $list = document.getElementById("sortable");
  let dragItem = null;

  $list.addEventListener("dragstart", (e) => {
    dragItem = e.target;
    e.target.classList.add("is-dragging");
  });

  $list.addEventListener("dragend", (e) => {
    e.target.classList.remove("is-dragging");
    dragItem = null;
  });

  $list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = getDragAfterElement($list, e.clientY);
    if (after == null) $list.appendChild(dragItem);
    else $list.insertBefore(dragItem, after);
  });
}

function getDragAfterElement(container, y) {
  const items = [
    ...container.querySelectorAll(".sortable__item:not(.is-dragging)"),
  ];
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset)
        return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

async function finish() {
  try {
    const $list = document.getElementById("sortable");
    const order = [...$list.querySelectorAll(".sortable__item")].map(
      (i) => i.textContent,
    );
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    await submitAttempt(
      state.studentAssignment,
      state.activity.activityId,
      { order },
      timeSpent,
    );

    showActivitySuccess(
      $body,
      {
        title: "¡Orden enviado!",
        score: state.items.length,
        total: state.items.length,
        message: "Tus respuestas se guardaron correctamente.",
      },
      state.studentAssignment._id,
    );
  } catch (error) {
    console.error("[ordering] Error al enviar:", error);
    showActivityError($body, "No pudimos enviar tu orden.");
  }
}

async function init() {
  try {
    const { studentAssignment, activity } = await loadActivityContext();
    state.studentAssignment = studentAssignment;
    state.activity = activity;

    const items = activity.items || activity.config?.items || [];
    /* Mezclar items para que el estudiante los ordene */
    state.items = items.map((text, i) => ({ text, originalIndex: i }));
    state.items.sort(() => Math.random() - 0.5);

    render();
  } catch (error) {
    console.error("[ordering] Error:", error);
    showActivityError(
      $body,
      error.message || "No pudimos cargar la actividad.",
    );
  }
}

init();
