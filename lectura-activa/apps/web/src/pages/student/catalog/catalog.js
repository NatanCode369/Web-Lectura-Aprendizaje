import '../../../utils/analytics.js';
/* Pantalla: Catálogo de lecturas — Dueño: Omar */

import { readingService } from "../../../services/readingsService.js";
import { formatDifficulty } from "../../../utils/formatters.js";
import { qs, debounce, escapeHtml } from "../../../utils/dom.js";

const state = {
  search: "",
  difficulty: "",
  maxMinutes: "",
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  data: [],
};

const els = {
  loading: qs("#loading-state"),
  empty: qs("#empty-state"),
  error: qs("#error-state"),
  errorMessage: qs("#error-message"),
  grid: qs("#readings-grid"),
  carousel: qs("#catalog-carousel"),
  carouselPrev: qs("#carousel-prev"),
  carouselNext: qs("#carousel-next"),
  count: qs(".catalog__count"),
  retryButton: qs("#retry-button"),
  searchInput: qs("#search-input"),
  filterDifficulty: qs("#filter-difficulty"),
  filterDuration: qs("#filter-duration"),
};

function showState(name) {
  ["loading", "empty", "error"].forEach((key) => {
    const el = els[key];
    if (el) el.hidden = key !== name;
  });

  if (els.carousel) els.carousel.hidden = name !== "grid";
  if (els.count) els.count.hidden = name !== "grid";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

function renderCard(reading) {
  const difficulty = escapeHtml(reading.difficulty || "");
  const difficultyLabel = formatDifficulty(reading.difficulty);
  const minutes = reading.estimatedMinutes ?? "—";
  const authorName = reading.authorName
    ? `Por: ${escapeHtml(reading.authorName)}`
    : "";

  return `
    <a
      href="../reading-detail/reading-detail.html?id=${escapeHtml(reading.id)}"
      class="reading-card reading-card--${difficulty}"
      data-id="${escapeHtml(reading.id)}"
      aria-label="Leer ${escapeHtml(reading.title)}"
    >
      <h2 class="reading-card__title">${escapeHtml(reading.title)}</h2>
      <p class="reading-card__summary">${escapeHtml(reading.summary)}</p>
      <div class="reading-card__meta">
        <span class="reading-card__difficulty reading-card__difficulty--${difficulty}">
          ${difficultyLabel}
        </span>
        <span class="reading-card__minutes">
          <span aria-hidden="true">⏱</span> ${minutes} min
        </span>
      </div>
      ${authorName ? `<p class="reading-card__author">${authorName}</p>` : ""}
    </a>
  `;
}

function renderGrid(readings) {
  if (!els.grid) return;
  if (!readings || readings.length === 0) {
    els.grid.innerHTML = "";
    return;
  }
  els.grid.innerHTML = readings.map(renderCard).join("");
}

function renderCount(total) {
  if (!els.count) return;
  els.count.innerHTML = `<strong>${total}</strong> lecturas disponibles`;
}

async function loadReadings() {
  showState("loading");

  try {
    const response = await readingService.list({
      search: state.search || undefined,
      difficulty: state.difficulty || undefined,
      maxMinutes: state.maxMinutes ? Number(state.maxMinutes) : undefined,
      page: state.page,
      limit: state.limit,
    });

    const data = response.data ?? [];
    const pagination = response.pagination ?? {};

    state.data = data;
    state.total = pagination.total ?? data.length;
    state.totalPages = pagination.totalPages ?? 1;

    if (data.length === 0) {
      showState("empty");
      return;
    }

    renderGrid(data);
    renderCount(state.total);
    showState("grid");

    if (els.grid) els.grid.scrollLeft = 0;
    updateCarouselButtons();
  } catch (error) {
    console.error("[catalog] Error al cargar lecturas:", error);
    showError(error.message || "No pudimos cargar las lecturas.");
  }
}

function updateCarouselButtons() {
  if (!els.grid) return;

  const { scrollLeft, scrollWidth, clientWidth } = els.grid;
  const canScrollLeft = scrollLeft > 5;
  const canScrollRight = scrollLeft + clientWidth < scrollWidth - 5;

  if (els.carouselPrev) els.carouselPrev.disabled = !canScrollLeft;
  if (els.carouselNext) els.carouselNext.disabled = !canScrollRight;

  if (els.carousel) {
    els.carousel.dataset.scrolledLeft = canScrollLeft ? "true" : "false";
    els.carousel.dataset.scrolledRight = canScrollRight ? "true" : "false";
  }
}

function scrollCarousel(direction = 1) {
  if (!els.grid) return;

  const card = els.grid.querySelector(".reading-card");
  if (!card) return;

  const cardWidth = card.offsetWidth;
  const gap = 24;
  const scrollAmount = (cardWidth + gap) * direction;

  els.grid.scrollBy({ left: scrollAmount, behavior: "smooth" });
}

const debouncedSearch = debounce(() => {
  state.page = 1;
  loadReadings();
}, 300);

if (els.searchInput) {
  els.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    debouncedSearch();
  });
}

if (els.filterDifficulty) {
  els.filterDifficulty.addEventListener("change", (e) => {
    state.difficulty = e.target.value;
    state.page = 1;
    loadReadings();
  });
}

if (els.filterDuration) {
  els.filterDuration.addEventListener("change", (e) => {
    state.maxMinutes = e.target.value;
    state.page = 1;
    loadReadings();
  });
}

if (els.carouselPrev) {
  els.carouselPrev.addEventListener("click", () => scrollCarousel(-1));
}

if (els.carouselNext) {
  els.carouselNext.addEventListener("click", () => scrollCarousel(1));
}

if (els.grid) {
  els.grid.addEventListener("scroll", updateCarouselButtons);
  window.addEventListener("resize", updateCarouselButtons);
}

if (els.retryButton) {
  els.retryButton.addEventListener("click", loadReadings);
}

function init() {
  console.info("[catalog] Pantalla cargada.");
  loadReadings();
}

init();
