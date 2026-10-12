import '../../../utils/analytics.js';
/* Pantalla: Feedback (Resultados) — Dueño: Omar */

import { requireLogin } from "../../../utils/authGuard.js";
import { assignmentService } from "../../../services/assignmentsService.js";
import {
  formatDateTime,
  formatTime,
  getMotivationMessage,
} from "../../../utils/formatters.js";
import { qs, getParam } from "../../../utils/dom.js";

const state = {
  studentAssignmentId: null,
  studentAssignment: null,
};

const els = {
  loading: qs("#loading-state"),
  error: qs("#error-state"),
  errorMessage: qs('[data-field="errorMessage"]'),
  content: qs("#feedback-content"),
  readingTitle: qs('[data-field="readingTitle"]'),
  score: qs('[data-field="score"]'),
  scoreMax: qs('[data-field="scoreMax"]'),
  timeSpent: qs('[data-field="timeSpent"]'),
  completedAt: qs('[data-field="completedAt"]'),
  scoreProgressBar: qs('[data-field="scoreProgressBar"]'),
  scoreProgressFill: qs('[data-field="scoreProgressFill"]'),
  motivation: qs('[data-field="motivation"]'),
  completedCount: qs('[data-field="completedCount"]'),
  totalCount: qs('[data-field="totalCount"]'),
};

function showState(name) {
  if (els.loading) els.loading.hidden = name !== "loading";
  if (els.error) els.error.hidden = name !== "error";
  if (els.content) els.content.hidden = name !== "content";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

function getScoreLevel(percentage) {
  if (percentage >= 80) return "high";
  if (percentage >= 60) return "mid";
  return "low";
}

function renderFeedback(sa) {
  const score = typeof sa.score === "number" ? sa.score : 0;
  const progress = Array.isArray(sa.activityProgress) ? sa.activityProgress : [];

  // ✅ FIX: calcular el máximo real desde activityProgress
  const maxScore = progress.reduce((acc, p) => acc + (p.maxScore ?? 10), 0) || 100;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const scoreLevel = getScoreLevel(percentage);
  const readingTitle = sa.readingTitle || sa.assignment?.readingTitle || "Lectura";

  if (els.readingTitle) els.readingTitle.textContent = readingTitle;

  if (els.score) {
    els.score.textContent = String(Math.round(score));
    els.score.className = `feedback__score-value feedback__score-value--${scoreLevel}`;
  }

  // ✅ FIX: mostrar el máximo real
  if (els.scoreMax) {
    els.scoreMax.textContent = String(maxScore);
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
    els.scoreProgressBar.setAttribute("aria-valuenow", String(percentage));
  }
  if (els.scoreProgressFill) {
    els.scoreProgressFill.style.width = `${percentage}%`;
    els.scoreProgressFill.className = `feedback__progress-fill feedback__progress-fill--${scoreLevel}`;
  }

  // ✅ FIX: usar percentage (0-100) para la motivación
  if (els.motivation) {
    els.motivation.textContent = getMotivationMessage(percentage);
  }

  const completed = progress.filter((p) => p.status === "completed").length;

  if (els.completedCount) els.completedCount.textContent = String(completed);
  if (els.totalCount) els.totalCount.textContent = String(progress.length);

  document.title = `Resultados: ${readingTitle} — Lectura Activa`;
}

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

function init() {
  state.studentAssignmentId = getParam("id");
  console.info("[feedback] Pantalla cargada. ID:", state.studentAssignmentId);
  requireLogin().then((user) => {
    if (!user) return;
    loadFeedback();
  });
}

init();