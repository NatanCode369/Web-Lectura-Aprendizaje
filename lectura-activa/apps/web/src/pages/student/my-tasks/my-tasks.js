import { assignmentService } from "../../../services/assignmentsService.js";
import { readingService } from "../../../services/readingsService.js";
import { formatDateTime } from "../../../utils/formatters.js";
import { qs, qsa, escapeHtml } from "../../../utils/dom.js";

/* Estado */
const state = {
  tasks: [],
  enriched: [],
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
  const reading = task.reading || {};
  const assignment = task.assignment || {};

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

  const groupText = reading.groupName
    ? `Grupo: ${escapeHtml(reading.groupName)}`
    : "";

  return `
    <li>
      <a
        href="${config.href(task._id)}"
        class="task-card task-card--${task.status.replace("_", "-")}"
        data-id="${escapeHtml(task._id)}"
        aria-label="${escapeHtml(config.action)} ${escapeHtml(reading.title || "lectura")}"
      >
        <div class="task-card__header">
          <span
            class="task-card__status task-card__status--${task.status.replace("_", "-")}"
            aria-hidden="true"
          >
            ${config.icon}
          </span>
          <h3 class="task-card__title">${escapeHtml(reading.title || "Lectura")}</h3>
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

        ${
          reading.summary
            ? `<p class="task-card__summary">${escapeHtml(reading.summary)}</p>`
            : ""
        }

        <div class="task-card__meta">
          ${groupText ? `<span class="task-card__group">${groupText}</span>` : ""}
          ${
            reading.estimatedMinutes
              ? `<span class="task-card__minutes">
                  <span aria-hidden="true">⏱</span> ${reading.estimatedMinutes} min
                </span>`
              : ""
          }
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
    pending: state.enriched.filter((t) => t.status === "pending"),
    in_progress: state.enriched.filter((t) => t.status === "in_progress"),
    completed: state.enriched.filter((t) => t.status === "completed"),
  };

  renderGroup("pending", grouped.pending);
  renderGroup("in_progress", grouped.in_progress);
  renderGroup("completed", grouped.completed);

  const total = state.enriched.length;

  if (els.empty) els.empty.hidden = total > 0;
  if (els.listContainer) els.listContainer.hidden = total === 0;
  if (els.statsContainer) els.statsContainer.hidden = total === 0;
}

/* Enriquecer una tarea con datos de la lectura */
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
    console.warn("[my-tasks] No se pudo cargar la lectura:", readingId, error);
    return { ...task, reading: {} };
  }
}

/* Cargar todas las tareas y enriquecerlas */
async function loadTasks() {
  try {
    const response = await assignmentService.listMine({ limit: 50 });
    const items = response?.items ?? [];

    state.tasks = items;

    /* Enriquecer en paralelo */
    state.enriched = await Promise.all(items.map(enrichTask));

    renderAll();
  } catch (error) {
    console.error("[my-tasks] Error al cargar tareas:", error);

    if (error.status === 401) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

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

      /* Si estaba activo, quitar filtro */
      if (isActive) {
        btn.setAttribute("aria-pressed", "false");
        renderAll();
        return;
      }

      /* Desactivar los demás */
      els.filters.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");

      /* Mostrar solo el grupo seleccionado */
      Object.entries(els.groups).forEach(([status, group]) => {
        if (group) group.hidden = status !== filter;
      });
    });
  });
}

/* Inicialización */
function init() {
  console.info("[my-tasks] Pantalla cargada.");
  setupFilters();
  loadTasks();
}

init();
