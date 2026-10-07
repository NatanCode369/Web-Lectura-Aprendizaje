import '../../../utils/analytics.js';
/* Pantalla: Feedback (Resultados) — Dueño: Omar */

import { assignmentService } from "../../../services/assignmentsService.js";
import {
  formatDateTime,
  formatTime,
  getMotivationMessage,
} from "../../../utils/formatters.js";
import { qs, getParam } from "../../../utils/dom.js";

/* Estado */
const state = {
  studentAssignmentId: null,
  studentAssignment: null,
};

/* Referencias del DOM */
const els = {
  loading: qs("#loading-state"),
  error: qs("#error-state"),
  errorMessage: qs('[data-field="errorMessage"]'),
  content: qs("#feedback-content"),
  readingTitle: qs('[data-field="readingTitle"]'),
  score: qs('[data-field="score"]'),
  timeSpent: qs('[data-field="timeSpent"]'),
  completedAt: qs('[data-field="completedAt"]'),
  scoreProgressBar: qs('[data-field="scoreProgressBar"]'),
  scoreProgressFill: qs('[data-field="scoreProgressFill"]'),
  motivation: qs('[data-field="motivation"]'),
  completedCount: qs('[data-field="completedCount"]'),
  totalCount: qs('[data-field="totalCount"]'),
};

/* Estados */
function showState(name) {
  if (els.loading) els.loading.hidden = name !== "loading";
  if (els.error) els.error.hidden = name !== "error";
  if (els.content) els.content.hidden = name !== "content";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

function getScoreLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

/* Render */
function renderFeedback(sa) {
  const score = typeof sa.score === "number" ? sa.score : 0;
  const scoreLevel = getScoreLevel(score);
  const readingTitle =
    sa.readingTitle || sa.assignment?.readingTitle || "Lectura";

  if (els.readingTitle) els.readingTitle.textContent = readingTitle;

  if (els.score) {
    els.score.textContent = String(Math.round(score));
    els.score.className = `feedback__score-value feedback__score-value--${scoreLevel}`;
  }

  if (els.timeSpent) {
    els.timeSpent.textContent = sa.timeSpentSeconds
      ? formatTime(sa.timeSpentSeconds)
      : "—";
  }

  if (els.completedAt) {
    els.completedAt.textContent = sa.completedAt
      ? formatDateTime(sa.completedAt)
      : "—";
  }

  if (els.scoreProgressBar) {
    els.scoreProgressBar.setAttribute("aria-valuenow", String(score));
  }
  if (els.scoreProgressFill) {
    els.scoreProgressFill.style.width = `${score}%`;
    els.scoreProgressFill.className = `feedback__progress-fill feedback__progress-fill--${scoreLevel}`;
  }

  if (els.motivation) {
    els.motivation.textContent = getMotivationMessage(score);
  }

  const progress = Array.isArray(sa.activityProgress)
    ? sa.activityProgress
    : [];
  const completed = progress.filter((p) => p.status === "completed").length;

  if (els.completedCount) els.completedCount.textContent = String(completed);
  if (els.totalCount) els.totalCount.textContent = String(progress.length);

  document.title = `Resultados: ${readingTitle} — Lectura Activa`;
}

/* Cargar */
async function loadFeedback() {
  if (!state.studentAssignmentId) {
    showError("No especificaste qué resultado abrir.");
    return;
  }

  showState("loading");

  try {
    const saResponse = await assignmentService.getMine(
      state.studentAssignmentId,
    );
    const studentAssignment = saResponse?.data ?? saResponse;

    if (!studentAssignment) {
      showError("No encontramos estos resultados.");
      return;
    }

    state.studentAssignment = studentAssignment;
    renderFeedback(studentAssignment);
    showState("content");
  } catch (error) {
    console.error("[feedback] Error al cargar:", error);

    if (error.status === 401) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    if (error.status === 404) {
      showError("No encontramos estos resultados.");
      return;
    }

    if (error.status === 403) {
      showError("Estos resultados no te pertenecen.");
      return;
    }

    showError(error.message || "No pudimos cargar los resultados.");
  }
}

/* Init */
function init() {
  state.studentAssignmentId = getParam("id");
  console.info("[feedback] Pantalla cargada. ID:", state.studentAssignmentId);
  loadFeedback();
}

init();
