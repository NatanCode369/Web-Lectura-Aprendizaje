/**
 * catalog.js
 * Carga, filtra y muestra las lecturas del catálogo.
 * Combina lecturas mock con las lecturas reales creadas por el docente.
 */

// ============================================================
// DATOS
// ============================================================
const LECTURAS_MOCK = [
  { id: 'fake_001', title: 'El principito', summary: 'Un piloto conoce a un pequeño príncipe que viene de otro planeta y le enseña lecciones sobre la vida, el amor y la amistad.', difficulty: 'easy', estimatedMinutes: 15, authorName: 'Ana López' },
  { id: 'fake_002', title: '1984', summary: 'Una distopía sobre un régimen totalitario que controla todo, incluso el pensamiento, y la lucha de un hombre por la libertad.', difficulty: 'hard', estimatedMinutes: 45, authorName: 'Luis Pérez' },
  { id: 'fake_003', title: 'Cien años de soledad', summary: 'La historia de la familia Buendía en el pueblo de Macondo, con realismo mágico y personajes inolvidables.', difficulty: 'medium', estimatedMinutes: 30, authorName: 'Gabriel García Márquez' },
  { id: 'fake_004', title: 'La casa de los espíritus', summary: 'La saga de la familia Trueba a lo largo de varias generaciones, con elementos mágicos y políticos.', difficulty: 'medium', estimatedMinutes: 40, authorName: 'Isabel Allende' },
  { id: 'fake_005', title: 'Don Quijote de la Mancha', summary: 'Las aventuras de un hidalgo que decide convertirse en caballero andante y vive todo tipo de peripecias.', difficulty: 'hard', estimatedMinutes: 60, authorName: 'Miguel de Cervantes' },
  { id: 'fake_006', title: 'El Principito (corto)', summary: 'Versión corta para lectores principiantes del clásico de Saint-Exupéry.', difficulty: 'easy', estimatedMinutes: 8, authorName: 'Ana López' }
];

// Cargar las lecturas reales creadas por el docente
const lecturasGuardadas = JSON.parse(localStorage.getItem('lecturas_docente') || '[]');

// Combinar: primero las del docente, luego los mocks
const LECTURAS = [...lecturasGuardadas, ...LECTURAS_MOCK];

// ============================================================
// REFERENCIAS
// ============================================================
const $grid = document.getElementById('readings-grid');
const $count = document.querySelector('.catalog__count strong');
const $search = document.getElementById('search-input');
const $filterDifficulty = document.getElementById('filter-difficulty');
const $filterDuration = document.getElementById('filter-duration');
const $carousel = document.getElementById('catalog-carousel');
const $prev = document.getElementById('carousel-prev');
const $next = document.getElementById('carousel-next');

let lecturasFiltradas = [...LECTURAS];

// ============================================================
// UTILIDADES
// ============================================================
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ETIQUETA_DIFICULTAD = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' };

// ============================================================
// RENDER
// ============================================================
function renderLecturas() {
  if (lecturasFiltradas.length === 0) {
    $grid.innerHTML = '<p class="catalog__empty">No encontramos lecturas con esos filtros.</p>';
    $count.textContent = '0';
    return;
  }

  $grid.innerHTML = lecturasFiltradas.map((l) => `
    <a
      href="../reading-detail/reading-detail.html?id=${encodeURIComponent(l.id)}"
      class="reading-card reading-card--${l.difficulty}"
      data-id="${escapeHtml(l.id)}"
      aria-label="Leer ${escapeHtml(l.title)}"
    >
      <h2 class="reading-card__title">${escapeHtml(l.title)}</h2>
      <p class="reading-card__summary">${escapeHtml(l.summary)}</p>
      <div class="reading-card__meta">
        <span class="reading-card__difficulty reading-card__difficulty--${l.difficulty}">
          ${ETIQUETA_DIFICULTAD[l.difficulty]}
        </span>
        <span class="reading-card__minutes">
          <span aria-hidden="true">⏱</span> ${l.estimatedMinutes} min
        </span>
      </div>
      <p class="reading-card__author">Por: ${escapeHtml(l.authorName)}</p>
    </a>
  `).join('');

  $count.textContent = lecturasFiltradas.length;
}

// ============================================================
// FILTROS
// ============================================================
function aplicarFiltros() {
  const texto = $search.value.trim().toLowerCase();
  const dif = $filterDifficulty.value;
  const dur = $filterDuration.value;

  lecturasFiltradas = LECTURAS.filter((l) => {
    if (texto) {
      const coincide = l.title.toLowerCase().includes(texto) || l.summary.toLowerCase().includes(texto);
      if (!coincide) return false;
    }
    if (dif && l.difficulty !== dif) return false;
    if (dur && l.estimatedMinutes > Number(dur)) return false;
    return true;
  });

  renderLecturas();
}

$search.addEventListener('input', aplicarFiltros);
$filterDifficulty.addEventListener('change', aplicarFiltros);
$filterDuration.addEventListener('change', aplicarFiltros);

// ============================================================
// CARRUSEL
// ============================================================
function actualizarBotonesCarrusel() {
  const scrollLeft = $grid.scrollLeft;
  const scrollMax = $grid.scrollWidth - $grid.clientWidth;

  $prev.hidden = scrollLeft < 10;
  $next.hidden = scrollLeft > scrollMax - 10;

  $carousel.dataset.scrolledLeft = scrollLeft > 10 ? 'true' : 'false';
  $carousel.dataset.scrolledRight = scrollLeft < scrollMax - 10 ? 'true' : 'false';
}

$prev.addEventListener('click', () => {
  $grid.scrollBy({ left: -320, behavior: 'smooth' });
});

$next.addEventListener('click', () => {
  $grid.scrollBy({ left: 320, behavior: 'smooth' });
});

$grid.addEventListener('scroll', actualizarBotonesCarrusel);
window.addEventListener('resize', actualizarBotonesCarrusel);

// ============================================================
// INICIALIZAR
// ============================================================
renderLecturas();
setTimeout(actualizarBotonesCarrusel, 100);