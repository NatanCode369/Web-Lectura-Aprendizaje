const params = new URLSearchParams(window.location.search);
const lecturaId = params.get('lectura') || 'liebre-tortuga';
const tipo = 'order';
const claveCompletada = `completada_${lecturaId}_${tipo}`;

const yaCompletada = localStorage.getItem(claveCompletada);
if (yaCompletada) {
  const r = JSON.parse(yaCompletada);
  document.getElementById('body').innerHTML = `
    <div class="activity__finish">
      <h2>Ya completaste esta actividad</h2>
      <p class="activity__score">${r.puntaje} / ${r.total}</p>
      <p class="activity__msg">No puedes repetirla.</p>
      <div class="activity__actions">
        <a href="../catalog/catalog.html" class="btn btn--primary">Volver al inicio</a>
      </div>
    </div>
  `;
  throw new Error('stop');
}

const $body = document.getElementById('body');
let intentos = 0;

$body.innerHTML = `
  <p class="activity__hint">Arrastra los eventos al orden correcto.</p>
  <ul class="sortable" id="sortable">
    <li class="sortable__item" draggable="true">La tortuga retó a la liebre a una carrera.</li>
    <li class="sortable__item" draggable="true">La liebre se burlaba de la tortuga.</li>
    <li class="sortable__item" draggable="true">La tortuga llegó primero a la meta.</li>
    <li class="sortable__item" draggable="true">La liebre se durmió a mitad del camino.</li>
  </ul>
  <button class="btn btn--primary" id="check">Comprobar orden</button>
  <div class="feedback" id="feedback" hidden></div>
`;

const $list = document.getElementById('sortable');
let dragItem = null;

$list.addEventListener('dragstart', e => {
  dragItem = e.target;
  e.target.classList.add('is-dragging');
});

$list.addEventListener('dragend', e => {
  e.target.classList.remove('is-dragging');
  dragItem = null;
});

$list.addEventListener('dragover', e => {
  e.preventDefault();
  const after = getDragAfterElement($list, e.clientY);
  if (after == null) $list.appendChild(dragItem);
  else $list.insertBefore(dragItem, after);
});

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll('.sortable__item:not(.is-dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

const correctOrder = [
  "La liebre se burlaba de la tortuga.",
  "La tortuga retó a la liebre a una carrera.",
  "La liebre se durmió a mitad del camino.",
  "La tortuga llegó primero a la meta."
];

document.getElementById('check').addEventListener('click', () => {
  const current = [...$list.querySelectorAll('.sortable__item')].map(i => i.textContent);
  const isCorrect = JSON.stringify(current) === JSON.stringify(correctOrder);
  intentos++;
  if (isCorrect) {
    const puntaje = Math.max(1, 4 - intentos + 1);
    localStorage.setItem(claveCompletada, JSON.stringify({
      puntaje, total: 4, fecha: new Date().toISOString()
    }));
    $body.innerHTML = `
      <div class="activity__finish">
        <h2>¡Orden correcto!</h2>
        <p class="activity__score">${puntaje} / 4</p>
        <p class="activity__msg">Lo lograste en ${intentos} intento${intentos === 1 ? '' : 's'}.</p>
        <p class="activity__msg">Ya no puedes repetir esta actividad.</p>
        <div class="activity__actions">
          <a href="../catalog/catalog.html" class="btn btn--primary">Volver al inicio</a>
        </div>
      </div>
    `;
  } else {
    const $fb = document.getElementById('feedback');
    $fb.textContent = 'Hay errores en el orden. Intenta de nuevo.';
    $fb.className = 'feedback feedback--error';
    $fb.hidden = false;
  }
});