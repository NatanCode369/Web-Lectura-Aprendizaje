/* Pantalla: Mi progreso — Dueño: Omar */

import { assignmentService } from "../../../services/assignmentsService.js";
import { readingService } from "../../../services/readingsService.js";
import {
  formatDate,
  formatTime,
  getScoreLevel,
} from "../../../utils/formatters.js";
import { qs, escapeHtml } from "../../../utils/dom.js";

/* Estado */
const state = {
  tasks: [],
  enriched: [],
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
  const reading = task.reading || {};
  const score = typeof task.score === "number" ? Math.round(task.score) : 0;
  const scoreLevel = getScoreLevel(score);

  const completedAt = task.completedAt ? formatDate(task.completedAt) : "—";
  const timeSpent = task.timeSpentSeconds
    ? formatTime(task.timeSpentSeconds)
    : "—";

  return `
    <li>
      <a
        href="../feedback/feedback.html?id=${escapeHtml(task._id)}"
        class="progress__item"
        aria-label="Ver resultados de ${escapeHtml(reading.title || "lectura")}"
      >
        <div class="progress__item-header">
          <h3 class="progress__item-title">${escapeHtml(reading.title || "Lectura")}</h3>
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

  /* Promedio: solo de las completadas con score numérico */
  const scores = completed
    .map((t) => t.score)
    .filter((s) => typeof s === "number" && s >= 0);
  const average = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null;

  /* Tiempo total */
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

/* Enriquecer tarea con datos de la lectura */
async function enrichTask(task) {
  const readingId = task.assignment?.readingId;
  if (!readingId) {
    return { ...task, reading: {} };
  }

  try {
    const response = await readingService.getById(readingId);
    const reading = response?.data ?? response;
    return {
      ...task,
      reading: {
        ...reading,
        id: reading.id ?? reading._id?.toString(),
      },
    };
  } catch (error) {
    console.warn(
      "[my-progress] No se pudo cargar la lectura:",
      readingId,
      error,
    );
    return { ...task, reading: {} };
  }
}

/* Cargar */
async function loadProgress() {
  showState("loading");

  try {
    /* 1. Cargar todas las tareas del estudiante */
    const response = await assignmentService.listMine({ limit: 100 });
    const items = response?.items ?? [];

    state.tasks = items;

    /* 2. Enriquecer con datos de las lecturas */
    state.enriched = await Promise.all(items.map(enrichTask));

    /* 3. Filtrar solo las completadas para el historial */
    const completed = state.enriched.filter((t) => t.status === "completed");

    /* 4. Renderizar */
    renderStats(state.enriched);
    renderHistory(completed);

    showState("content");
  } catch (error) {
    console.error("[my-progress] Error al cargar:", error);

    if (error.status === 401) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    showError(error.message || "No pudimos cargar tu progreso.");
  }
}

/* Init */
function init() {
  console.info("[my-progress] Pantalla cargada.");
  loadProgress();
}

init();
