import '../../utils/analytics.js';
/**
 * ============================================================
 * CONTRATO DE API — Editor de actividades
 * ============================================================
 * 
 * Endpoints usados (ya conectado, ver services/teacherReadingsService.js):
 *   GET   /api/v1/readings        → lecturas PUBLICADAS (el API no lista borradores)
 *   GET   /api/v1/readings/:id    → detalle con sus actividades (autor ve borradores)
 *   PATCH /api/v1/readings/:id    → guarda { activities: [...] }
 *   POST  /api/v1/readings/:id/publish → draft → published (≥ 1 actividad)
 *   POST  /api/v1/assignments     → una por cada grupo elegido en "Nueva lectura"
 *
 * Las actividades viajan EMBEBIDAS en la lectura (no existe /readings/:id/activities):
 *   trivia → multiple_choice · verdaderoFalso → true_false
 *   order → ordering · mindMap → matching · detective → aún no soportado
 *
 * Auth: Bearer token (Supabase) · Rol requerido: teacher (autor de la lectura)
 * ============================================================
 */

// ============================================================
// SERVICIOS Y PARÁMETROS DE LA URL
// ============================================================
// ?id=<lectura>            → lectura a editar (viene de "Nueva lectura")
// ?grupos=a,b&desde=&entrega= → asignaciones que se crean al publicar
import {
  teacherReadingService,
  activitiesToApi,
  activitiesFromApi
} from '../../services/teacherReadingsService.js';
import { teacherAssignmentService } from '../../services/teacherAssignmentsService.js';

const params = new URLSearchParams(window.location.search);
const lecturaIdUrl = params.get('id');
const gruposAsignar = (params.get('grupos') || '').split(',').filter(Boolean);
const fechaDesde = params.get('desde') || '';
const fechaEntrega = params.get('entrega') || '';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ============================================================
// REFERENCIAS
// ============================================================
const $ = (id) => document.getElementById(id);
const $lectura = $('lectura');
const $listaTrivia = $('lista-trivia');
const $listaVF = $('lista-vf');
const $listaEventos = $('lista-eventos');
const $listaParejas = $('lista-parejas');
const $mensaje = $('mensaje');
const $publicar = $('publish-btn');

let actividades = activitiesFromApi([]);
let lecturaActual = null;
let lecturaDetalle = null;

// ============================================================
// CARGA Y GUARDADO
// ============================================================
function mostrarMensaje(texto, esError = false) {
  $mensaje.textContent = texto;
  $mensaje.hidden = false;
  if (!esError) setTimeout(() => ($mensaje.hidden = true), 4000);
}

/** Guarda las actividades en la lectura (PATCH). Devuelve los avisos. */
async function guardarActividades() {
  const { activities, warnings } = activitiesToApi(actividades);
  lecturaDetalle = await teacherReadingService.update(lecturaActual, { activities });
  return warnings;
}

// ============================================================
// RENDER
// ============================================================
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

// ============================================================
// CAMBIO DE LECTURA
// ============================================================
async function cambiarLectura() {
  lecturaActual = $lectura.value;
  if (!lecturaActual) return;
  try {
    lecturaDetalle = await teacherReadingService.getById(lecturaActual);
    actividades = activitiesFromApi(lecturaDetalle.activities);
    renderTodo();
    $publicar.hidden = lecturaDetalle.status !== 'draft';
  } catch (error) {
    mostrarMensaje(`⚠️ ${error.message}`, true);
  }
}

$lectura.addEventListener('change', cambiarLectura);

// ============================================================
// EDICIÓN
// ============================================================
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

// ============================================================
// AGREGAR / QUITAR
// ============================================================
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

// ============================================================
// GUARDAR
// ============================================================
$('activities-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!lecturaActual) return mostrarMensaje('⚠️ Elige una lectura.', true);
  try {
    const avisos = await guardarActividades();
    mostrarMensaje(
      '✅ Actividades guardadas.' + (avisos.length ? ` ⚠️ ${avisos.join(' ')}` : '')
    );
  } catch (error) {
    mostrarMensaje(`⚠️ ${error.message}`, true);
  }
});

// ============================================================
// PUBLICAR (draft → published) Y ASIGNAR A GRUPOS
// ============================================================
$publicar.addEventListener('click', async () => {
  if (!lecturaActual) return;
  $publicar.disabled = true;
  try {
    const avisos = await guardarActividades();
    await teacherReadingService.publish(lecturaActual);

    const fallos = [];
    for (const groupId of gruposAsignar) {
      try {
        await teacherAssignmentService.create({
          readingId: lecturaActual,
          groupId,
          availableFrom: fechaDesde,
          dueAt: fechaEntrega
        });
      } catch (error) {
        fallos.push(error.message);
      }
    }

    $publicar.hidden = true;
    let texto = '✅ Lectura publicada.';
    if (gruposAsignar.length) {
      texto += fallos.length
        ? ` ⚠️ No se pudo asignar a ${fallos.length} grupo(s): ${fallos[0]}`
        : ` Asignada a ${gruposAsignar.length} grupo(s).`;
    }
    if (avisos.length) texto += ` ⚠️ ${avisos.join(' ')}`;
    mostrarMensaje(texto, fallos.length > 0);
  } catch (error) {
    mostrarMensaje(`⚠️ ${error.message}`, true);
  } finally {
    $publicar.disabled = false;
  }
});

// ============================================================
// INICIALIZAR
// ============================================================
// El API solo lista lecturas PUBLICADAS; un borrador recién creado se
// agrega aparte usando el ?id= de la URL.
async function init() {
  let lecturas = [];
  try {
    const respuesta = await teacherReadingService.listPublished({ limit: 50 });
    lecturas = (respuesta.data || []).map((l) => ({ id: l.id, titulo: l.title }));
  } catch (error) {
    mostrarMensaje(`⚠️ No se pudieron cargar las lecturas: ${error.message}`, true);
  }

  if (lecturaIdUrl && !lecturas.some((l) => l.id === lecturaIdUrl)) {
    try {
      const borrador = await teacherReadingService.getById(lecturaIdUrl);
      lecturas.unshift({ id: lecturaIdUrl, titulo: `${borrador.title} (borrador)` });
    } catch (error) {
      mostrarMensaje(`⚠️ ${error.message}`, true);
    }
  }

  if (!lecturas.length) {
    $lectura.innerHTML = '<option value="">Sin lecturas disponibles</option>';
    return;
  }

  $lectura.innerHTML = lecturas
    .map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.titulo)}</option>`)
    .join('');
  if (lecturaIdUrl) $lectura.value = lecturaIdUrl;
  await cambiarLectura();
}

init();
