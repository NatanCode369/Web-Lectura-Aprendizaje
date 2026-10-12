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

const state = {
  tasks: [],
};

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

function showState(name) {
  if (els.loading) els.loading.hidden = name !== "loading";
  if (els.error) els.error.hidden = name !== "error";
  if (els.content) els.content.hidden = name !== "content";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

/* ✅ FIX: calcular el máximo real desde activityProgress */
function getMaxScore(task) {
  const progress = Array.isArray(task.activityProgress) ? task.activityProgress : [];
  return progress.reduce((acc, p) => acc + (p.maxScore ?? 10), 0) || 100;
}

/* ✅ FIX: calcular el porcentaje real */
function getPercentage(task) {
  const maxScore = getMaxScore(task);
  const score = typeof task.score === "number" ? task.score : 0;
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

function renderHistoryItem(task) {
  const score = typeof task.score === "number" ? Math.round(task.score) : 0;
  const maxScore = getMaxScore(task);                       // ✅ NUEVO
  const percentage = getPercentage(task);                   // ✅ NUEVO
  const scoreLevel = getScoreLevel(percentage);             // ✅ Usa porcentaje
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
            ${score} / ${maxScore}
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

function renderStats(items) {
  const total = items.length;
  const completed = items.filter((t) => t.status === "completed");
  const completedCount = completed.length;

  // ✅ FIX: promedio basado en porcentajes, no en puntajes absolutos
  const percentages = completed
    .map((t) => getPercentage(t))
    .filter((p) => typeof p === "number" && p >= 0);
  const average = percentages.length
    ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
    : null;

  const totalTime = completed.reduce(
    (sum, t) => sum + (t.timeSpentSeconds || 0),
    0,
  );

  if (els.totalReadings) els.totalReadings.textContent = String(total);
  if (els.completedReadings)
    els.completedReadings.textContent = String(completedCount);
  if (els.averageScore)
    els.averageScore.textContent = average != null ? `${average}%` : "—";
  if (els.totalTime)
    els.totalTime.textContent = totalTime ? formatTime(totalTime) : "—";
}

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

function init() {
  console.info("[my-progress] Pantalla cargada.");
  requireLogin().then((user) => {
    if (!user) return;
    loadProgress();
  });
}

init();