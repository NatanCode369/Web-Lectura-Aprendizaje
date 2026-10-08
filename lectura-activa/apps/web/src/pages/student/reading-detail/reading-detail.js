import '../../../utils/analytics.js';
/* Pantalla: Detalle de lectura — Dueño: Omar */

import { requireLogin } from "../../../utils/authGuard.js";
import { readingService } from "../../../services/readingsService.js";
import { formatDifficulty, formatLevel } from "../../../utils/formatters.js";
import { qs, getParam, escapeHtml } from "../../../utils/dom.js";

/* Estado de la pantalla */
const state = {
  readingId: null,
  reading: null,
};

/* Referencias del DOM */
const els = {
  loading: qs("#loading-state"),
  error: qs("#error-state"),
  errorMessage: qs("#error-message"),
  content: qs("#detail-content"),
  breadcrumbTitle: qs('[data-field="breadcrumbTitle"]'),
  difficulty: qs('[data-field="difficulty"]'),
  progressBadge: qs('[data-field="progressBadge"]'),
  title: qs('[data-field="title"]'),
  author: qs('[data-field="author"]'),
  estimatedMinutes: qs('[data-field="estimatedMinutes"]'),
  activitiesCount: qs('[data-field="activitiesCount"]'),
  level: qs('[data-field="level"]'),
  summary: qs('[data-field="summary"]'),
  activitiesList: qs('[data-field="activities"]'),
  ctaTitle: qs('[data-field="ctaTitle"]'),
  ctaNote: qs('[data-field="ctaNote"]'),
  ctaPrimary: qs('[data-field="ctaPrimary"]'),
  ctaPrimaryText: qs('[data-field="ctaPrimaryText"]'),
};

/* Iconos y textos por tipo de actividad */
const ACTIVITY_META = {
  multiple_choice: {
    icon: "",
    title: "Preguntas de comprensión",
    text: "Responde preguntas sobre los personajes y la historia.",
  },
  true_false: {
    icon: "✓",
    title: "Verdadero o falso",
    text: "Identifica si las afirmaciones son verdaderas o falsas.",
  },
  short_answer: {
    icon: "✎",
    title: "Respuesta corta",
    text: "Escribe una respuesta breve a cada pregunta.",
  },
  ordering: {
    icon: "",
    title: "Ordena la historia",
    text: "Arrastra los hechos al orden correcto.",
  },
  matching: {
    icon: "",
    title: "Relacionar conceptos",
    text: "Une cada concepto con su definición.",
  },
};

/* Estados de UI */
function showState(name) {
  if (els.loading) els.loading.hidden = name !== "loading";
  if (els.error) els.error.hidden = name !== "error";
  if (els.content) els.content.hidden = name !== "content";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

/* Render de actividades */
function renderActivities(activities) {
  if (!els.activitiesList) return;

  if (!activities || activities.length === 0) {
    els.activitiesList.innerHTML = `
      <li class="detail__activity">
        <div class="detail__activity-content">
          <p class="detail__activity-text">
            Esta lectura no tiene actividades por ahora.
          </p>
        </div>
      </li>
    `;
    return;
  }

  els.activitiesList.innerHTML = activities
    .map((activity) => {
      const meta = ACTIVITY_META[activity.type] || {
        icon: "",
        title: "Actividad",
        text: "Completa esta actividad.",
      };

      return `
        <li class="detail__activity">
          <span class="detail__activity-icon" aria-hidden="true">${meta.icon}</span>
          <div class="detail__activity-content">
            <h3 class="detail__activity-title">${escapeHtml(meta.title)}</h3>
            <p class="detail__activity-text">${escapeHtml(meta.text)}</p>
          </div>
        </li>
      `;
    })
    .join("");
}

/* Rellenar el hero */
function renderHero(reading) {
  const difficulty = reading.difficulty || "easy";

  if (els.breadcrumbTitle) {
    els.breadcrumbTitle.textContent = reading.title ?? "—";
  }

  if (els.difficulty) {
    els.difficulty.textContent = formatDifficulty(difficulty);
    els.difficulty.className = `detail__difficulty detail__difficulty--${difficulty}`;
  }

  if (els.title) els.title.textContent = reading.title ?? "—";

  if (els.author) {
    els.author.textContent = reading.authorName
      ? `Por: ${reading.authorName}`
      : "";
  }
}

/* Rellenar la meta */
function renderMeta(reading) {
  const difficulty = reading.difficulty || "easy";
  const activitiesCount = reading.activities?.length ?? 0;

  if (els.estimatedMinutes) {
    els.estimatedMinutes.textContent = reading.estimatedMinutes
      ? `${reading.estimatedMinutes} min`
      : "—";
  }

  if (els.activitiesCount) {
    els.activitiesCount.textContent = String(activitiesCount);
  }

  if (els.level) els.level.textContent = formatLevel(difficulty);
}

/* Rellenar la sección de resumen */
function renderSummary(reading) {
  if (els.summary) {
    els.summary.textContent = reading.summary ?? "";
  }
}

/* Rellenar el CTA según el estado del estudiante */
function renderCta(reading) {
  const readingId = encodeURIComponent(reading.id);

  if (els.ctaPrimary) {
    els.ctaPrimary.href = `../reading-activity/reading-activity.html?id=${readingId}`;
  }

  if (els.ctaPrimaryText) {
    els.ctaPrimaryText.textContent = "Empezar a leer";
  }

  if (els.ctaTitle) {
    els.ctaTitle.textContent = "¿Listo para empezar?";
  }

  if (els.ctaNote) {
    els.ctaNote.textContent =
      "Una vez empieces, podrás pausar y continuar cuando quieras.";
  }

  if (els.progressBadge) {
    els.progressBadge.hidden = true;
  }
}

/* Render completo */
function renderDetail(reading) {
  renderHero(reading);
  renderMeta(reading);
  renderSummary(reading);
  renderActivities(reading.activities);
  renderCta(reading);

  document.title = `${reading.title ?? "Detalle"} — Lectura Activa`;
}

/* Manejo de errores por código HTTP */
function handleError(error) {
  console.error("[reading-detail] Error:", error);

  const status = error?.status;

  if (status === 401) {
    showError("Necesitas iniciar sesión para ver esta lectura.");
    return;
  }

  if (status === 403) {
    showError("No tienes permiso para ver esta lectura.");
    return;
  }

  if (status === 404) {
    showError("No encontramos esta lectura.");
    return;
  }

  if (status >= 500) {
    showError("El servidor tuvo un problema. Intenta de nuevo más tarde.");
    return;
  }

  if (error?.message?.includes("conectar")) {
    showError("No pudimos conectar con el servidor. Verifica tu conexión.");
    return;
  }

  showError(
    error?.message || "No pudimos cargar la lectura. Intenta de nuevo.",
  );
}

/* Normalizar el objeto que devuelve el backend */
function normalizeReading(raw) {
  if (!raw) return null;

  const id = raw.id ?? raw._id?.toString();

  return {
    ...raw,
    id,
  };
}

/* Cargar la lectura desde el backend */
async function loadReading() {
  if (!state.readingId) {
    showError("No especificaste qué lectura abrir.");
    return;
  }

  showState("loading");

  try {
    const response = await readingService.getById(state.readingId);
    const reading = normalizeReading(response?.data ?? response);

    if (!reading) {
      showError("Lectura no encontrada.");
      return;
    }

    state.reading = reading;
    renderDetail(reading);
    showState("content");
  } catch (error) {
    handleError(error);
  }
}

/* Inicialización */
function init() {
  state.readingId = getParam("id");
  console.info("[reading-detail] Pantalla cargada. ID:", state.readingId);
  requireLogin().then((user) => {
    if (!user) return; // redirigido al login
    loadReading();
  });
}

init();
