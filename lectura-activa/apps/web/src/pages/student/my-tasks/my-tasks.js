import '../../../utils/analytics.js';
/* Pantalla: Mis tareas — Dueño: Omar */

import { requireLogin } from "../../../utils/authGuard.js";
import { assignmentService } from "../../../services/assignmentsService.js";
import { formatDateTime } from "../../../utils/formatters.js";
import { qs, qsa, escapeHtml } from "../../../utils/dom.js";

/* Estado */
const state = {
  tasks: [],
};

/* Referencias del DOM */
const els = {
  filters: qsa(".tasks__stat"),
  groups: {
    pending: qs('[data-status="pending"]'),
    in_progress: qs('[data-status="in_progress"]'),
    completed: qs('[data-status="completed"]'),
  },
  lists: {
    pending: qs('[data-status="pending"] .tasks__group-list'),
    in_progress: qs('[data-status="in_progress"] .tasks__group-list'),
    completed: qs('[data-status="completed"] .tasks__group-list'),
  },
  counts: {
    pending: qs("#group-pending-title .tasks__group-count"),
    in_progress: qs("#group-progress-title .tasks__group-count"),
    completed: qs("#group-completed-title .tasks__group-count"),
  },
  statNumbers: {
    pending: qs('[data-filter="pending"] .tasks__stat-number'),
    in_progress: qs('[data-filter="in_progress"] .tasks__stat-number'),
    completed: qs('[data-filter="completed"] .tasks__stat-number'),
  },
  empty: qs(".tasks__empty"),
  listContainer: qs(".tasks__list"),
  statsContainer: qs(".tasks__stats"),
};

/* Configuración de estados */
const STATUS_CONFIG = {
  pending: {
    action: "Empezar a leer",
    href: (id) =>
      `../reading-activity/reading-activity.html?id=${encodeURIComponent(id)}`,
    icon: "●",
  },
  in_progress: {
    action: "Continuar leyendo",
    href: (id) =>
      `../reading-activity/reading-activity.html?id=${encodeURIComponent(id)}`,
    icon: "◐",
  },
  completed: {
    action: "Ver resultados",
    href: (id) => `../feedback/feedback.html?id=${encodeURIComponent(id)}`,
    icon: "✓",
  },
};

/* ¿La fecha de vencimiento está a menos de 3 días? */
function isDueSoon(isoDate) {
  if (!isoDate) return false;
  const due = new Date(isoDate).getTime();
  const now = Date.now();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

/* Render de una tarjeta */
function renderTaskCard(task) {
  const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const assignment = task.assignment || {};

  const readingTitle =
    task.readingTitle || assignment.readingTitle || "Lectura";
  const groupName = task.groupName || assignment.groupName || null;

  const dueText = assignment.dueAt
    ? `Vence: ${formatDateTime(assignment.dueAt)}`
    : "";
  const dueSoon = isDueSoon(assignment.dueAt);

  const scoreText =
    task.status === "completed" && typeof task.score === "number"
      ? `${Math.round(task.score)} / 100`
      : "";

  const completedText =
    task.status === "completed" && task.completedAt
      ? `Completada el ${formatDateTime(task.completedAt)}`
      : "";

  return `
    <li>
      <a
        href="${config.href(task._id)}"
        class="task-card task-card--${task.status.replace("_", "-")}"
        data-id="${escapeHtml(task._id)}"
        aria-label="${escapeHtml(config.action)} ${escapeHtml(readingTitle)}"
      >
        <div class="task-card__header">
          <span
            class="task-card__status task-card__status--${task.status.replace("_", "-")}"
            aria-hidden="true"
          >
            ${config.icon}
          </span>
          <h3 class="task-card__title">${escapeHtml(readingTitle)}</h3>
          ${
            scoreText
              ? `<span class="task-card__score">${scoreText}</span>`
              : dueText
                ? `<span class="task-card__due ${
                    dueSoon ? "task-card__due--soon" : ""
                  }">${dueText}</span>`
                : ""
          }
        </div>

        <div class="task-card__meta">
          ${groupName ? `<span class="task-card__group">Grupo: ${escapeHtml(groupName)}</span>` : ""}
          ${
            completedText
              ? `<span class="task-card__completed-date">${completedText}</span>`
              : ""
          }
        </div>

        <span class="task-card__action">
          ${config.action}
          <span aria-hidden="true">→</span>
        </span>
      </a>
    </li>
  `;
}

/* Render de un grupo */
function renderGroup(status, tasks) {
  const listEl = els.lists[status];
  const groupEl = els.groups[status];
  const countEl = els.counts[status];
  const statEl = els.statNumbers[status];

  if (countEl) countEl.textContent = String(tasks.length);
  if (statEl) statEl.textContent = String(tasks.length);

  if (groupEl) groupEl.hidden = tasks.length === 0;

  if (listEl) {
    listEl.innerHTML = tasks.map(renderTaskCard).join("");
  }
}

/* Render completo */
function renderAll() {
  const grouped = {
    pending: state.tasks.filter((t) => t.status === "pending"),
    in_progress: state.tasks.filter((t) => t.status === "in_progress"),
    completed: state.tasks.filter((t) => t.status === "completed"),
  };

  renderGroup("pending", grouped.pending);
  renderGroup("in_progress", grouped.in_progress);
  renderGroup("completed", grouped.completed);

  const total = state.tasks.length;

  if (els.empty) els.empty.hidden = total > 0;
  if (els.listContainer) els.listContainer.hidden = total === 0;
  if (els.statsContainer) els.statsContainer.hidden = total === 0;
}

/* Cargar todas las tareas */
async function loadTasks() {
  try {
    const response = await assignmentService.listMine({ limit: 50 });
    state.tasks = response?.items ?? [];
    renderAll();
  } catch (error) {
    console.error("[my-tasks] Error al cargar tareas:", error);

    if (els.empty) els.empty.hidden = false;
    if (els.listContainer) els.listContainer.hidden = true;
    if (els.statsContainer) els.statsContainer.hidden = true;
  }
}

/* Filtros por estado */
function setupFilters() {
  els.filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      const isActive = btn.getAttribute("aria-pressed") === "true";

      if (isActive) {
        btn.setAttribute("aria-pressed", "false");
        renderAll();
        return;
      }

      els.filters.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");

      Object.entries(els.groups).forEach(([status, group]) => {
        if (group) group.hidden = status !== filter;
      });
    });
  });
}

/* Inicialización */
function init() {
  console.info("[my-tasks] Pantalla cargada.");
  requireLogin().then((user) => {
    if (!user) return; // redirigido al login
    setupFilters();
    loadTasks();
  });
}

init();
