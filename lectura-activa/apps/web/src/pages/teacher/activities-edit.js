/**
 * activities-edit.js
 * Editor de las 5 actividades de una lectura.
 * Usa la misma clave que espera reading-activity.html: `actividades_${lecturaId}`.
 */

const LECTURAS = [
  { id: 'liebre-tortuga', titulo: 'La liebre y la tortuga' },
  { id: 'leon-raton', titulo: 'El león y el ratón' },
  { id: 'zorra-uvas', titulo: 'La zorra y las uvas' }
];

const $ = (id) => document.getElementById(id);
const $lectura = $('lectura');
const $listaTrivia = $('lista-trivia');
const $listaVF = $('lista-vf');
const $listaEventos = $('lista-eventos');
const $listaParejas = $('lista-parejas');
const $mensaje = $('mensaje');

let actividades = null;
let lecturaActual = null;

// ---------- Carga y guardado ----------
function cargarActividades(lecturaId) {
  const guardadas = localStorage.getItem(`actividades_${lecturaId}`);
  if (guardadas) return JSON.parse(guardadas);
  return {
    trivia: [{ pregunta: '', opciones: ['', '', '', ''], correcta: 0 }],
    verdaderoFalso: [{ afirmacion: '', respuesta: true }],
    detective: { target: '', synonyms: [], distractors: [] },
    order: ['', '', '', ''],
    mindMap: [{ a: '', b: '' }]
  };
}

function guardarActividades(lecturaId, acts) {
  localStorage.setItem(`actividades_${lecturaId}`, JSON.stringify(acts));
}

// ---------- Render ----------
function renderTrivia() {
  $listaTrivia.innerHTML = actividades.trivia.map((q, i) => `
    <div class="q-item">
      <div class="q-item__header">
        <span class="q-item__label">Pregunta ${i + 1}</span>
        <button type="button" class="q-item__remove" data-tipo="trivia" data-index="${i}">Quitar</button>
      </div>
      <input class="q-item__input" type="text" value="${q.pregunta}" placeholder="Pregunta" data-tipo="trivia" data-index="${i}" data-field="pregunta">
      ${q.opciones.map((op, j) => `
        <div class="q-item__option">
          <input type="radio" name="trivia-${i}" ${q.correcta === j ? 'checked' : ''} data-tipo="trivia" data-index="${i}" data-opcion="${j}">
          <input type="text" value="${op}" data-tipo="trivia" data-index="${i}" data-opcion="${j}" data-field="opcion" placeholder="Opción ${j + 1}">
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderVF() {
  $listaVF.innerHTML = actividades.verdaderoFalso.map((v, i) => `
    <div class="q-item">
      <div class="q-item__header">
        <span class="q-item__label">Afirmación ${i + 1}</span>
        <button type="button" class="q-item__remove" data-tipo="vf" data-index="${i}">Quitar</button>
      </div>
      <textarea class="q-item__input" data-tipo="vf" data-index="${i}" data-field="afirmacion" placeholder="Afirmación">${v.afirmacion}</textarea>
      <div class="q-item__vf">
        <label><input type="radio" name="vf-${i}" ${v.respuesta === true ? 'checked' : ''} data-tipo="vf" data-index="${i}" data-respuesta="true"> Verdadero</label>
        <label><input type="radio" name="vf-${i}" ${v.respuesta === false ? 'checked' : ''} data-tipo="vf" data-index="${i}" data-respuesta="false"> Falso</label>
      </div>
    </div>
  `).join('');
}

function renderEventos() {
  $listaEventos.innerHTML = actividades.order.map((ev, i) => `
    <div class="q-item">
      <div class="q-item__header">
        <span class="q-item__label">Evento ${i + 1}</span>
        <button type="button" class="q-item__remove" data-tipo="order" data-index="${i}">Quitar</button>
      </div>
      <input class="q-item__input" type="text" value="${ev}" placeholder="Evento" data-tipo="order" data-index="${i}" data-field="evento">
    </div>
  `).join('');
}

function renderParejas() {
  $listaParejas.innerHTML = actividades.mindMap.map((p, i) => `
    <div class="q-item">
      <div class="q-item__header">
        <span class="q-item__label">Pareja ${i + 1}</span>
        <button type="button" class="q-item__remove" data-tipo="mindmap" data-index="${i}">Quitar</button>
      </div>
      <div class="q-item__option">
        <input type="text" value="${p.a}" placeholder="Concepto A" data-tipo="mindmap" data-index="${i}" data-field="a">
        <input type="text" value="${p.b}" placeholder="Concepto B" data-tipo="mindmap" data-index="${i}" data-field="b">
      </div>
    </div>
  `).join('');
}

function renderTodo() {
  renderTrivia();
  renderVF();
  renderEventos();
  renderParejas();
  $('detective-target').value = actividades.detective.target || '';
  $('detective-synonyms').value = (actividades.detective.synonyms || []).join(', ');
  $('detective-distractors').value = (actividades.detective.distractors || []).join(', ');
}

// ---------- Cambio de lectura ----------
function cambiarLectura() {
  lecturaActual = $lectura.value;
  actividades = cargarActividades(lecturaActual);
  renderTodo();
}

$lectura.addEventListener('change', cambiarLectura);

// ---------- Edición ----------
document.addEventListener('input', (e) => {
  const el = e.target;
  const tipo = el.dataset.tipo;
  if (!tipo) return;
  const index = Number(el.dataset.index);

  if (tipo === 'trivia') {
    if (el.dataset.field === 'pregunta') actividades.trivia[index].pregunta = el.value;
    if (el.dataset.field === 'opcion') actividades.trivia[index].opciones[el.dataset.opcion] = el.value;
  }
  if (tipo === 'vf' && el.dataset.field === 'afirmacion') {
    actividades.verdaderoFalso[index].afirmacion = el.value;
  }
  if (tipo === 'order') actividades.order[index] = el.value;
  if (tipo === 'mindmap') {
    if (el.dataset.field === 'a') actividades.mindMap[index].a = el.value;
    if (el.dataset.field === 'b') actividades.mindMap[index].b = el.value;
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.type !== 'radio') return;
  if (el.dataset.tipo === 'trivia') actividades.trivia[el.dataset.index].correcta = Number(el.dataset.opcion);
  if (el.dataset.tipo === 'vf') actividades.verdaderoFalso[el.dataset.index].respuesta = el.dataset.respuesta === 'true';
});

$('detective-target').addEventListener('input', (e) => actividades.detective.target = e.target.value);
$('detective-synonyms').addEventListener('input', (e) => actividades.detective.synonyms = e.target.value.split(',').map(s => s.trim()).filter(Boolean));
$('detective-distractors').addEventListener('input', (e) => actividades.detective.distractors = e.target.value.split(',').map(s => s.trim()).filter(Boolean));

// ---------- Agregar / quitar ----------
$('add-trivia').addEventListener('click', () => {
  actividades.trivia.push({ pregunta: '', opciones: ['', '', '', ''], correcta: 0 });
  renderTrivia();
});
$('add-vf').addEventListener('click', () => {
  actividades.verdaderoFalso.push({ afirmacion: '', respuesta: true });
  renderVF();
});
$('add-evento').addEventListener('click', () => {
  actividades.order.push('');
  renderEventos();
});
$('add-pareja').addEventListener('click', () => {
  actividades.mindMap.push({ a: '', b: '' });
  renderParejas();
});

document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('q-item__remove')) return;
  const tipo = e.target.dataset.tipo;
  const index = Number(e.target.dataset.index);
  if (tipo === 'trivia') { actividades.trivia.splice(index, 1); renderTrivia(); }
  if (tipo === 'vf') { actividades.verdaderoFalso.splice(index, 1); renderVF(); }
  if (tipo === 'order') { actividades.order.splice(index, 1); renderEventos(); }
  if (tipo === 'mindmap') { actividades.mindMap.splice(index, 1); renderParejas(); }
});

// ---------- Guardar ----------
$('activities-form').addEventListener('submit', (e) => {
  e.preventDefault();
  guardarActividades(lecturaActual, actividades);
  $mensaje.textContent = '✅ Actividades guardadas correctamente.';
  $mensaje.hidden = false;
  setTimeout(() => $mensaje.hidden = true, 3000);
});

// ---------- Inicializar ----------
$lectura.innerHTML = LECTURAS.map(l => `<option value="${l.id}">${l.titulo}</option>`).join('');
cambiarLectura();