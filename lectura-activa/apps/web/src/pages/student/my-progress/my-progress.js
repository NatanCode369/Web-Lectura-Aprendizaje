import '../../../utils/analytics.js';
/* Pantalla: Mi progreso — Dueño: Omar */

import { requireLogin } from "../../../utils/authGuard.js";
import { assignmentService } from "../../../services/assignmentsService.js";
import {
  formatDate,
  formatTime,
  getScoreLevel,
} from "../../../utils/formatters.js";
import { qs, escapeHtml } from "../../../utils/dom.js";

/* Estado */
const state = {
  tasks: [],
};

/* Referencias del DOM */
const els = {
  loading: qs("#loading-state"),
  error: qs("#error-state"),
  errorMessage: qs('[data-field="errorMessage"]'),
  content: qs("#progress-content"),
  totalReadings: qs('[data-field="totalReadings"]'),
  completedReadings: qs('[data-field="completedReadings"]'),
  averageScore: qs('[data-field="averageScore"]'),
  totalTime: qs('[data-field="totalTime"]'),
  historyCount: qs('[data-field="historyCount"]'),
  historyList: qs('[data-field="historyList"]'),
  empty: qs(".progress__empty"),
  section: qs(".progress__section"),
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

/* Render de un item del historial */
function renderHistoryItem(task) {
  const score = typeof task.score === "number" ? Math.round(task.score) : 0;
  const scoreLevel = getScoreLevel(score);
  const readingTitle =
    task.readingTitle || task.assignment?.readingTitle || "Lectura";

  const completedAt = task.completedAt ? formatDate(task.completedAt) : "—";
  const timeSpent = task.timeSpentSeconds
    ? formatTime(task.timeSpentSeconds)
    : "—";

  return `
    <li>
      <a
        href="../feedback/feedback.html?id=${escapeHtml(task._id)}"
        class="progress__item"
        aria-label="Ver resultados de ${escapeHtml(readingTitle)}"
      >
        <div class="progress__item-header">
          <h3 class="progress__item-title">${escapeHtml(readingTitle)}</h3>
          <span class="progress__item-score progress__item-score--${scoreLevel}">
            ${score} / 100
          </span>
        </div>

        <div class="progress__item-meta">
          <span class="progress__item-date">
            <span aria-hidden="true">📅</span>
            <span>${completedAt}</span>
          </span>
          <span class="progress__item-time">
            <span aria-hidden="true">⏱</span>
            <span>${timeSpent}</span>
          </span>
        </div>

        <div class="progress__item-footer">
          <span class="progress__item-action">
            Ver resultados
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </a>
    </li>
  `;
}

/* Calcular y renderizar estadísticas */
function renderStats(items) {
  const total = items.length;
  const completed = items.filter((t) => t.status === "completed");
  const completedCount = completed.length;

  const scores = completed
    .map((t) => t.score)
    .filter((s) => typeof s === "number" && s >= 0);
  const average = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null;

  const totalTime = completed.reduce(
    (sum, t) => sum + (t.timeSpentSeconds || 0),
    0,
  );

  if (els.totalReadings) els.totalReadings.textContent = String(total);
  if (els.completedReadings)
    els.completedReadings.textContent = String(completedCount);
  if (els.averageScore)
    els.averageScore.textContent = average != null ? String(average) : "—";
  if (els.totalTime)
    els.totalTime.textContent = totalTime ? formatTime(totalTime) : "—";
}

/* Render del historial */
function renderHistory(completedTasks) {
  if (els.historyCount) {
    els.historyCount.textContent = String(completedTasks.length);
  }

  if (completedTasks.length === 0) {
    if (els.empty) els.empty.hidden = false;
    if (els.section) els.section.hidden = true;
    return;
  }

  if (els.empty) els.empty.hidden = true;
  if (els.section) els.section.hidden = false;

  if (els.historyList) {
    els.historyList.innerHTML = completedTasks.map(renderHistoryItem).join("");
  }
}

/* Cargar */
async function loadProgress() {
  showState("loading");

  try {
    const response = await assignmentService.listMine({ limit: 100 });
    state.tasks = response?.items ?? [];

    const completed = state.tasks.filter((t) => t.status === "completed");

    renderStats(state.tasks);
    renderHistory(completed);

    showState("content");
  } catch (error) {
    console.error("[my-progress] Error al cargar:", error);
    showError(error.message || "No pudimos cargar tu progreso.");
  }
}

/* Init */
function init() {
  console.info("[my-progress] Pantalla cargada.");
  requireLogin().then((user) => {
    if (!user) return; // redirigido al login
    loadProgress();
  });
}

init();
