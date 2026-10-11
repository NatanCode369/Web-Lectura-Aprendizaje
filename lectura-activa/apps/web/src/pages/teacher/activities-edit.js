import '../../utils/analytics.js';
/**
 * Editor de actividades — P6 (José)
 *
 * ✅ FIX: el botón "Guardar y publicar" solo se muestra si la lectura
 *    está en estado `draft`. Si ya está publicada, se oculta.
 */

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

function mostrarMensaje(texto, esError = false) {
  $mensaje.textContent = texto;
  $mensaje.hidden = false;
  if (!esError) setTimeout(() => ($mensaje.hidden = true), 4000);
}

async function guardarActividades() {
  const { activities, warnings } = activitiesToApi(actividades);
  lecturaDetalle = await teacherReadingService.update(lecturaActual, { activities });
  return warnings;
}

function renderTrivia() {
  $listaTrivia.innerHTML = actividades.trivia.map((q, i) => `
    <div class="q-item">
      <div class="q-item__header">
        <span class="q-item__label">Pregunta ${i + 1}</span>
        <button type="button" class="q-item__remove" data-tipo="trivia" data-index="${i}">Quitar</button>
      </div>
      <input class="q-item__input" type="text" value="${escapeHtml(q.pregunta)}" placeholder="Pregunta" data-tipo="trivia" data-index="${i}" data-field="pregunta">
      ${q.opciones.map((op, j) => `
        <div class="q-item__option">
          <input type="radio" name="trivia-${i}" ${q.correcta === j ? 'checked' : ''} data-tipo="trivia" data-index="${i}" data-opcion="${j}">
          <input type="text" value="${escapeHtml(op)}" data-tipo="trivia" data-index="${i}" data-opcion="${j}" data-field="opcion" placeholder="Opción ${j + 1}">
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
      <textarea class="q-item__input" data-tipo="vf" data-index="${i}" data-field="afirmacion" placeholder="Afirmación">${escapeHtml(v.afirmacion)}</textarea>
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
      <input class="q-item__input" type="text" value="${escapeHtml(ev)}" placeholder="Evento" data-tipo="order" data-index="${i}" data-field="evento">
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
        <input type="text" value="${escapeHtml(p.a)}" placeholder="Concepto A" data-tipo="mindmap" data-index="${i}" data-field="a">
        <input type="text" value="${escapeHtml(p.b)}" placeholder="Concepto B" data-tipo="mindmap" data-index="${i}" data-field="b">
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

async function cambiarLectura() {
  lecturaActual = $lectura.value;
  if (!lecturaActual) return;
  try {
    const response = await teacherReadingService.getById(lecturaActual);
    lecturaDetalle = response?.data ?? response;
    actividades = activitiesFromApi(lecturaDetalle?.activities || []);
    renderTodo();

    // ✅ FIX: mostrar el botón "Guardar y publicar" SOLO si la lectura es borrador
    const esBorrador = lecturaDetalle?.status === 'draft';
    $publicar.hidden = !esBorrador;
    $publicar.textContent = 'Guardar y publicar';
  } catch (error) {
    mostrarMensaje(`⚠️ ${error.message}`, true);
  }
}

$lectura.addEventListener('change', cambiarLectura);

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

$('activities-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!lecturaActual) return mostrarMensaje('⚠️ Elige una lectura.', true);
  try {
    const avisos = await guardarActividades();
    mostrarMensaje('✅ Actividades guardadas.' + (avisos.length ? ` ⚠️ ${avisos.join(' ')}` : ''));
  } catch (error) {
    mostrarMensaje(`⚠️ ${error.message}`, true);
  }
});

$publicar.addEventListener('click', async () => {
  if (!lecturaActual) return;
  $publicar.disabled = true;
  try {
    const avisos = await guardarActividades();

    // ✅ FIX: solo publicar si todavía es borrador
    if (lecturaDetalle?.status === 'draft') {
      await teacherReadingService.publish(lecturaActual);
      lecturaDetalle.status = 'published';
    }

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

    // ✅ FIX: ocultar el botón después de publicar (ya no sirve)
    $publicar.hidden = true;

    let texto = lecturaDetalle?.status === 'published'
      ? '✅ Lectura publicada.'
      : '✅ Cambios guardados.';
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

async function init() {
  let lecturas = [];
  try {
    const respuesta = await teacherReadingService.listPublished({ limit: 50 });
    lecturas = (respuesta.data || []).map((l) => ({ id: l.id, _id: l.id, title: l.title, status: 'published' }));
  } catch (error) {
    mostrarMensaje(`⚠️ No se pudieron cargar las lecturas: ${error.message}`, true);
  }

  if (lecturaIdUrl && !lecturas.some((l) => l.id === lecturaIdUrl || l._id === lecturaIdUrl)) {
    try {
      const response = await teacherReadingService.getById(lecturaIdUrl);
      const borrador = response?.data ?? response;
      if (borrador) {
        lecturas.unshift({
          id: lecturaIdUrl,
          _id: lecturaIdUrl,
          title: `${borrador.title} (borrador)`,
          status: borrador.status || 'draft',
        });
      }
    } catch (error) {
      mostrarMensaje(`⚠️ ${error.message}`, true);
    }
  }

  if (!lecturas.length) {
    $lectura.innerHTML = '<option value="">Sin lecturas disponibles</option>';
    return;
  }

  $lectura.innerHTML = lecturas
    .map((l) => `<option value="${escapeHtml(l.id || l._id)}">${escapeHtml(l.title)}</option>`)
    .join('');
  if (lecturaIdUrl) $lectura.value = lecturaIdUrl;
  await cambiarLectura();
}

init();