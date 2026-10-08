/* Pantalla: Lectura y actividades — Dueño: Omar */

import { requireLogin } from "../../../utils/authGuard.js";
import { assignmentService } from "../../../services/assignmentsService.js";
import { readingService } from "../../../services/readingsService.js";
import { formatTimer } from "../../../utils/formatters.js";
import {
  qs,
  getParam,
  generateRequestId,
  escapeHtml,
} from "../../../utils/dom.js";

/* ============================================================
   Configuración: tipo backend → pantalla HTML
   ============================================================ */
const ACTIVITY_SCREENS = {
  multiple_choice: "multiple-choice.html",
  true_false: "true-false.html",
  ordering: "ordering.html",
  matching: "matching.html",
  detective: "detective-words.html",
};

/* Iconos y títulos por tipo */
const ACTIVITY_INFO = {
  multiple_choice: { icon: "", title: "Preguntas de comprensión" },
  true_false: { icon: "", title: "Verdadero o falso" },
  ordering: { icon: "", title: "Ordena la historia" },
  matching: { icon: "", title: "Relacionar conceptos" },
  short_answer: { icon: "", title: "Respuesta corta" },
  short_text: { icon: "", title: "Respuesta corta" },
  detective: { icon: "", title: "Detective de palabras" },
};

/* ============================================================
   Estado
   ============================================================ */
const state = {
  studentAssignmentId: null,
  studentAssignment: null,
  reading: null,
  activities: [],
  completedActivityIds: new Set(),
  remainingSeconds: 0,
  totalSeconds: 0,
  timerInterval: null,
  extraNoticeShown: false,
};

/* ============================================================
   Referencias del DOM
   ============================================================ */
const els = {
  loading: qs("#loading-state"),
  error: qs("#error-state"),
  errorMessage: qs('[data-field="errorMessage"]'),
  content: qs("#activity-content"),
  title: qs('[data-field="title"]'),
  pdf: qs('[data-field="pdf"]'),
  pdfWrapper: qs(".activity__pdf-wrapper"),
  timerContainer: qs('[data-field="timerContainer"]'),
  timer: qs('[data-field="timer"]'),
  timeExtraNotice: qs("#time-extra-notice"),
  toggle: qs("#activities-toggle"),
  toggleText: qs('[data-field="toggleText"]'),
  activitiesCount: qs('[data-field="activitiesCount"]'),
  panel: qs("#activities-panel"),
  activitiesList: qs('[data-field="activitiesList"]'),
  completedCount: qs('[data-field="completedCount"]'),
  totalCount: qs('[data-field="totalCount"]'),
  feedbackWrapper: qs('[data-field="feedbackWrapper"]'),
  goToFeedback: qs("#go-to-feedback"),
};

/* ============================================================
   Estados de UI
   ============================================================ */
function showState(name) {
  if (els.loading) els.loading.hidden = name !== "loading";
  if (els.error) els.error.hidden = name !== "error";
  if (els.content) els.content.hidden = name !== "content";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

/* ============================================================
   PDF
   ============================================================ */
function renderPdf(reading) {
  if (!els.pdf) return;

  const pdfUrl =
    reading?.media?.pdfUrl ||
    reading?.pdfUrl ||
    reading?.contentUrl ||
    reading?.content?.pdfUrl ||
    null;

  if (!pdfUrl) {
    if (els.pdfWrapper) {
      els.pdfWrapper.innerHTML = `
        <div class="activity__pdf-empty">
          <span class="activity__pdf-empty-icon" aria-hidden="true">📄</span>
          <p class="activity__pdf-empty-text">
            El PDF de esta lectura aún no está disponible.
          </p>
        </div>
      `;
    }
    console.warn(
      "[reading-activity] El backend no devolvió URL del PDF. Revisar con Adrián."
    );
    return;
  }

  els.pdf.src = pdfUrl;
  els.pdf.title = reading.title || "Lectura";
}

/* ============================================================
   Temporizador
   ============================================================ */
function updateTimer() {
  state.remainingSeconds -= 1;

  if (els.timer) {
    els.timer.textContent = formatTimer(state.remainingSeconds);
  }

  const pct =
    state.totalSeconds > 0 ? state.remainingSeconds / state.totalSeconds : 0;

  if (els.timerContainer) {
    els.timerContainer.classList.remove(
      "activity__timer--warning",
      "activity__timer--danger",
      "activity__timer--over"
    );

    if (state.remainingSeconds < 0) {
      els.timerContainer.classList.add("activity__timer--over");
    } else if (pct <= 0.1) {
      els.timerContainer.classList.add("activity__timer--danger");

      if (!state.extraNoticeShown && els.timeExtraNotice) {
        els.timeExtraNotice.hidden = false;
        state.extraNoticeShown = true;
      }
    } else if (pct <= 0.25) {
      els.timerContainer.classList.add("activity__timer--warning");
    }
  }
}

function startTimer() {
  if (state.timerInterval) return;
  state.timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

/* ============================================================
   Render de la lista de actividades
   ============================================================ */
function renderActivitiesList() {
  if (!els.activitiesList) return;

  if (state.activities.length === 0) {
    els.activitiesList.innerHTML = `
      <li class="activity__list-empty">
        Esta lectura no tiene actividades por ahora.
      </li>
    `;
    if (els.feedbackWrapper) els.feedbackWrapper.hidden = true;
    return;
  }

  els.activitiesList.innerHTML = state.activities
    .map((activity) => {
      const info = ACTIVITY_INFO[activity.type] || {
        icon: "📝",
        title: "Actividad",
      };
      const screen = ACTIVITY_SCREENS[activity.type];
      const isCompleted = state.completedActivityIds.has(
        String(activity.activityId)
      );

      if (!screen) {
        return `
          <li class="activity__list-item activity__list-item--disabled">
            <span class="activity__list-icon" aria-hidden="true">${info.icon}</span>
            <div class="activity__list-content">
              <h3 class="activity__list-title">${escapeHtml(info.title)}</h3>
              <p class="activity__list-text">
                Este tipo de actividad (${escapeHtml(activity.type)}) aún no está disponible.
              </p>
            </div>
          </li>
        `;
      }

      const statusIcon = isCompleted ? "✅" : "⏳";
      const statusText = isCompleted ? "Completada" : "Pendiente";

      const content = `
        <span class="activity__list-icon" aria-hidden="true">${info.icon}</span>
        <div class="activity__list-content">
          <h3 class="activity__list-title">${escapeHtml(info.title)}</h3>
          <p class="activity__list-text">${escapeHtml(activity.prompt || "Completa esta actividad.")}</p>
        </div>
        <span class="activity__list-status activity__list-status--${isCompleted ? "completed" : "pending"}">
          ${statusIcon} ${statusText}
        </span>
      `;

      if (isCompleted) {
        return `
          <li class="activity__list-item activity__list-item--completed">
            ${content}
          </li>
        `;
      }

      const href = `../activities/${screen}?id=${encodeURIComponent(
        state.studentAssignmentId
      )}&activityId=${encodeURIComponent(activity.activityId)}`;

      return `
        <li class="activity__list-item">
          <a class="activity__list-link" href="${href}" aria-label="Abrir ${escapeHtml(info.title)}">
            ${content}
          </a>
        </li>
      `;
    })
    .join("");

  updateCompletionState();
}

/* Actualizar contadores y botón de feedback */
function updateCompletionState() {
  const total = state.activities.length;
  const completed = state.completedActivityIds.size;

  if (els.completedCount) els.completedCount.textContent = String(completed);
  if (els.totalCount) els.totalCount.textContent = String(total);

  const allDone = total > 0 && completed === total;

  if (els.feedbackWrapper) {
    els.feedbackWrapper.hidden = !allDone;
  }

  if (els.goToFeedback) {
    els.goToFeedback.href = `../feedback/feedback.html?id=${encodeURIComponent(
      state.studentAssignmentId
    )}`;
  }
}

/* ============================================================
   Toggle del panel
   ============================================================ */
function togglePanel() {
  const isExpanded = els.toggle?.getAttribute("aria-expanded") === "true";

  if (isExpanded) {
    els.toggle.setAttribute("aria-expanded", "false");
    if (els.panel) els.panel.hidden = true;
    if (els.toggleText) els.toggleText.textContent = "Ver actividades";
  } else {
    els.toggle.setAttribute("aria-expanded", "true");
    if (els.panel) els.panel.hidden = false;
    if (els.toggleText) els.toggleText.textContent = "Ocultar actividades";
    renderActivitiesList();
  }
}

/* ============================================================
   Carga
   ============================================================ */
async function loadActivity() {
  if (!state.studentAssignmentId) {
    showError("No especificaste qué lectura abrir.");
    return;
  }

  showState("loading");

  try {
    /* 1. Cargar la tarea */
    const saResponse = await assignmentService.getMine(
      state.studentAssignmentId
    );
    const studentAssignment = saResponse?.data ?? saResponse;

    if (!studentAssignment) {
      showError("No encontramos esta tarea.");
      return;
    }

    if (studentAssignment.status === "completed") {
      window.location.href = `../feedback/feedback.html?id=${encodeURIComponent(
        state.studentAssignmentId
      )}`;
      return;
    }

    state.studentAssignment = studentAssignment;

    /* 2. Cargar la lectura (para el PDF) */
    const readingId = studentAssignment.assignment?.readingId;
    if (readingId) {
      try {
        const readingResponse = await readingService.getById(readingId);
        state.reading = readingResponse?.data ?? readingResponse;
      } catch (readingError) {
        console.warn(
          "[reading-activity] No se pudo cargar la lectura:",
          readingError
        );
        state.reading = null;
      }
    }

    /* 3. Llamar a start para obtener activitySnapshot */
    const startResponse = await assignmentService.start(
      studentAssignment.assignmentId,
      generateRequestId()
    );

    state.activities = startResponse?.activitySnapshot || [];

    /* 4. Marcar actividades ya completadas */
    const progress = studentAssignment.activityProgress || [];
    progress.forEach((p) => {
      if (p.status === "completed" && p.activityId) {
        state.completedActivityIds.add(String(p.activityId));
      }
    });

    /* 5. Rellenar el título */
    const title =
      studentAssignment.readingTitle ||
      state.reading?.title ||
      studentAssignment.assignment?.readingTitle ||
      "Lectura";
    if (els.title) els.title.textContent = title;
    document.title = `${title} — Lectura Activa`;

    /* 6. Renderizar el PDF */
    renderPdf(state.reading);

    /* 7. Contadores */
    if (els.activitiesCount) {
      els.activitiesCount.textContent = String(state.activities.length);
    }
    if (els.totalCount) {
      els.totalCount.textContent = String(state.activities.length);
    }
    if (els.completedCount) {
      els.completedCount.textContent = String(state.completedActivityIds.size);
    }

    /* 8. Temporizador */
    const timeLimitMinutes =
      studentAssignment.assignment?.timeLimitMinutes ?? 20;
    state.totalSeconds = timeLimitMinutes * 60;
    state.remainingSeconds = state.totalSeconds;
    if (els.timer) els.timer.textContent = formatTimer(state.remainingSeconds);
    startTimer();

    /* 9. Mostrar contenido */
    showState("content");

    /* 10. Si todas están completas, abrir el panel */
    if (
      state.activities.length > 0 &&
      state.completedActivityIds.size === state.activities.length
    ) {
      togglePanel();
    }
  } catch (error) {
    console.error("[reading-activity] Error al cargar:", error);

    if (error.status === 404) {
      showError("No encontramos esta tarea.");
      return;
    }

    if (error.status === 403) {
      showError("Esta tarea no te pertenece.");
      return;
    }

    showError(error.message || "No pudimos cargar la lectura.");
  }
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  state.studentAssignmentId = getParam("id");
  console.info(
    "[reading-activity] Pantalla cargada. ID:",
    state.studentAssignmentId
  );

  if (els.toggle) els.toggle.addEventListener("click", togglePanel);

  requireLogin().then((user) => {
    if (!user) return; // redirigido al login
    loadActivity();
  });
}

init();